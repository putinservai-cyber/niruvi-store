import workerThreads from 'node:worker_threads';
import { syncBuiltinESMExports } from 'node:module';

// Polyfill worker_threads.markAsUncloneable on older Node 20.x / 22.x point releases
// so jsdom v30 / undici v8 never throws "TypeError: webidl.util.markAsUncloneable is not a function"
if (typeof workerThreads.markAsUncloneable !== 'function') {
  workerThreads.markAsUncloneable = () => {};
  try {
    syncBuiltinESMExports();
  } catch {
    // Ignore if syncBuiltinESMExports fails
  }
}
