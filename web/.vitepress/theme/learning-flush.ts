// Account changes wait for mounted editors and canvases before replacing scope.
const writers = new Set<() => Promise<unknown>>();
export function registerLearningFlush(write: () => Promise<unknown>) {
  writers.add(write);
  return () => writers.delete(write);
}
export async function flushLearning() {
  let failure = "";
  const failed = (event: Event) => {
    failure = String((event as CustomEvent).detail);
  };
  window.addEventListener("plex-storage-error", failed);
  try {
    await Promise.all([...writers].map((write) => write()));
    if (failure) throw Error(failure);
  } finally {
    window.removeEventListener("plex-storage-error", failed);
  }
}
