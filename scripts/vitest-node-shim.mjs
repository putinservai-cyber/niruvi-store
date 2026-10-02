import workerThreads from 'node:worker_threads';
import { syncBuiltinESMExports } from 'node:module';

// Polyfill globalThis.Iterator on Node 20.x where ES2025 Iterator helpers are not yet global
// so jsdom v30 (dom-tree.js: class ChildrenIterator extends Iterator) never throws "ReferenceError: Iterator is not defined"
if (typeof globalThis.Iterator === 'undefined') {
  const IteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]()));
  function Iterator() {}
  Iterator.prototype = IteratorPrototype;
  if (!Iterator.prototype[Symbol.iterator]) {
    Iterator.prototype[Symbol.iterator] = function () {
      return this;
    };
  }
  globalThis.Iterator = Iterator;
}

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
