import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export function previewRootToken(root) {
  return createHash('sha256').update(resolve(root).toLowerCase()).digest('hex').slice(0, 20);
}

export async function probePreview(origin, root) {
  try {
    const response = await fetch(new URL('/__plex/health', origin), { signal: AbortSignal.timeout(1500) });
    if (!response.ok) return false;
    const health = await response.json();
    return health.app === 'plex-interactive-book' && health.rootToken === previewRootToken(root);
  } catch { return false; }
}

export function monitorPreview(origin, root, restart, { intervalMs = 2000, onError = () => {} } = {}) {
  let stopped = false, checking = false;
  const timer = setInterval(async () => {
    if (stopped || checking) return;
    checking = true;
    try {
      const available = await probePreview(origin, root);
      if (!available && !stopped) await restart();
    } catch (error) { onError(error); }
    finally { checking = false; }
  }, intervalMs);
  return () => { stopped = true; clearInterval(timer); };
}
