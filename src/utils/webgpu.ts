/**
 * Safe WebGPU initialization utility.
 * Gracefully handles browsers, environments, and devices without
 * supported GPU hardware, outdated drivers, or disabled acceleration.
 */

export interface GPUAdapterInfoLike {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}

export interface GPUAdapterLike {
  requestDevice: (descriptor?: unknown) => Promise<unknown>;
  requestAdapterInfo?: () => Promise<GPUAdapterInfoLike>;
}

export interface GPULike {
  requestAdapter: (options?: unknown) => Promise<GPUAdapterLike | null>;
}

export interface WebGPUStatus {
  supported: boolean;
  hasAdapter: boolean;
  adapterInfo?: GPUAdapterInfoLike;
  reason?: string;
}

function getNavigatorGPU(): GPULike | null {
  if (typeof window === 'undefined' && typeof navigator === 'undefined') {
    return null;
  }
  const nav = (typeof window !== 'undefined' ? window.navigator : navigator) as unknown as {
    gpu?: GPULike;
  };
  return nav && nav.gpu ? nav.gpu : null;
}

/**
 * Initializes WebGPU gracefully, returning null if hardware acceleration or drivers are missing.
 */
export async function initWebGPU(): Promise<unknown | null> {
  const gpu = getNavigatorGPU();
  if (!gpu) {
    return null;
  }

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return null;
    }

    const device = await adapter.requestDevice();
    return device;
  } catch (error) {
    console.warn('[WebGPU] Initialization handled gracefully:', error);
    return null;
  }
}

/**
 * Diagnoses WebGPU availability and returns descriptive status.
 */
export async function checkWebGPUStatus(): Promise<WebGPUStatus> {
  const gpu = getNavigatorGPU();
  if (!gpu) {
    return {
      supported: false,
      hasAdapter: false,
      reason: 'WebGPU API is not available on this browser or platform.',
    };
  }

  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: true,
        hasAdapter: false,
        reason:
          'No available graphics adapter found. Hardware acceleration may be disabled or GPU drivers require updating.',
      };
    }

    let adapterInfo: GPUAdapterInfoLike | undefined;
    if (typeof adapter.requestAdapterInfo === 'function') {
      try {
        const info = await adapter.requestAdapterInfo();
        adapterInfo = {
          vendor: info?.vendor,
          architecture: info?.architecture,
          device: info?.device,
          description: info?.description,
        };
      } catch {
        // Optional feature
      }
    }

    return {
      supported: true,
      hasAdapter: true,
      adapterInfo,
    };
  } catch (err) {
    return {
      supported: true,
      hasAdapter: false,
      reason: err instanceof Error ? err.message : 'Unknown WebGPU adapter error',
    };
  }
}
