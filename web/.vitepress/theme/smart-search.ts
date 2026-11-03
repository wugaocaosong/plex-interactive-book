import { create, insertMultiple, search } from "@orama/orama";
import { pipeline } from "@huggingface/transformers";
import type { SearchEntry } from "./types";

const MODEL_ID = "Xenova/bge-small-zh-v1.5";
const DIMENSIONS = 512;
const BATCH_SIZE = 12;
const VECTOR_CACHE_NAME = "plex-semantic-v1";

type SemanticDocument = {
  sectionId: string;
  title: string;
  group: string;
  text: string;
  embedding: number[];
};

type LocalExtractor = (
  texts: string | string[],
  options?: { pooling?: "mean" | "cls"; normalize?: boolean },
) => Promise<{ tolist: () => unknown }>;

let extractorRequest: Promise<LocalExtractor> | undefined;
let databaseRequest: Promise<ReturnType<typeof create>> | undefined;
let vectorCacheRequest: Promise<IDBDatabase | undefined> | undefined;

function openVectorCache() {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  vectorCacheRequest ??= new Promise((resolve) => {
    const request = indexedDB.open(VECTOR_CACHE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("indexes");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
  return vectorCacheRequest;
}

async function readVectorCache(key: string, expectedCount: number) {
  const db = await openVectorCache();
  if (!db) return undefined;
  return new Promise<number[][] | undefined>((resolve) => {
    const request = db.transaction("indexes", "readonly").objectStore("indexes").get(key);
    request.onsuccess = () => {
      const vectors = request.result as number[][] | undefined;
      resolve(Array.isArray(vectors) && vectors.length === expectedCount ? vectors : undefined);
    };
    request.onerror = () => resolve(undefined);
  });
}

async function writeVectorCache(key: string, vectors: number[][]) {
  const db = await openVectorCache();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const transaction = db.transaction("indexes", "readwrite");
    transaction.objectStore("indexes").put(vectors, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

function getIndexFingerprint(documents: { sectionId: string; title: string; text: string }[]) {
  let hash = 2166136261;
  for (const value of documents.map((item) => `${item.sectionId}\u0000${item.title}\u0000${item.text}\u0001`).join("")) {
    hash ^= value.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${MODEL_ID}:${(hash >>> 0).toString(16)}`;
}

function getExtractor(onProgress?: (message: string) => void): Promise<LocalExtractor> {
  if (!extractorRequest) {
    extractorRequest = (pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8",
      progress_callback: (event) => {
        if (event.status === "progress_total") {
          const loaded = Math.round(event.loaded / (1024 * 1024));
          const total = event.total > 0 ? Math.round(event.total / (1024 * 1024)) : 0;
          onProgress?.(total ? `正在下载语义模型… ${Math.round(event.progress)}%（${loaded}/${total} MB）` : `正在下载语义模型… ${loaded} MB`);
        }
      },
    }) as unknown as Promise<LocalExtractor>).catch((error) => {
      extractorRequest = undefined;
      throw error;
    });
  }
  return extractorRequest;
}

export async function prepareSemanticIndex(
  entries: SearchEntry[],
  onProgress: (message: string) => void,
) {
  if (!databaseRequest) databaseRequest = (async () => {
    const pages = entries.filter((entry) => entry.blocks.length && entry.id !== "cover");
    const documents = pages.map((entry) => ({
      sectionId: entry.id,
      title: entry.title,
      group: entry.group,
      text: entry.text.slice(0, 2400),
    }));
    const cacheKey = getIndexFingerprint(documents);
    onProgress("正在读取本地知识索引…");
    let vectors = await readVectorCache(cacheKey, documents.length);
    if (!vectors) {
      onProgress("首次加载中文语义模型（约 24 MB）…");
      const extractor = await getExtractor(onProgress);
      vectors = [];
      for (let start = 0; start < documents.length; start += BATCH_SIZE) {
        const batch = documents.slice(start, start + BATCH_SIZE);
        const tensor = await extractor(
          batch.map((item) => `${item.title}\n${item.text}`),
          { pooling: "cls", normalize: true },
        );
        vectors.push(...(tensor.tolist() as number[][]));
        onProgress(`正在整理教材知识点… ${Math.min(start + batch.length, documents.length)}/${documents.length}`);
      }
      await writeVectorCache(cacheKey, vectors);
    }

    const db = create({
      schema: {
        sectionId: "string",
        title: "string",
        group: "string",
        text: "string",
        embedding: `vector[${DIMENSIONS}]`,
      },
    });
    const indexed: SemanticDocument[] = documents.map((document, i) => ({
      ...document,
      embedding: vectors[i],
    }));
    insertMultiple(db, indexed);
    return db;
  })().catch((error) => {
    databaseRequest = undefined;
    throw error;
  });
  return databaseRequest;
}

export async function searchSemanticIndex(
  db: Awaited<ReturnType<typeof prepareSemanticIndex>>,
  term: string,
) {
  const extractor = await getExtractor();
  const tensor = await extractor(
    `为这个句子生成表示以用于检索相关文章：${term}`,
    { pooling: "cls", normalize: true },
  );
  const vector = (tensor.tolist() as number[][])[0];
  const runSearch = search as unknown as (
    database: ReturnType<typeof create>,
    options: Record<string, unknown>,
  ) => Promise<{ hits: { document: { sectionId: string }; score: number }[] }>;
  const results = await runSearch(db, {
    mode: "vector",
    vector: { value: vector, property: "embedding" },
    similarity: 0.35,
    limit: 6,
  });
  return results.hits.map(({ document, score }) => ({
    sectionId: document.sectionId,
    score,
  }));
}
