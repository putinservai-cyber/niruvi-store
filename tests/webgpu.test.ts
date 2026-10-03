// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initWebGPU, checkWebGPUStatus } from '../src/utils/webgpu';

describe('WebGPU Graceful Initialization & Diagnostics', () => {
  const originalNavigatorGpu = (window.navigator as unknown as { gpu?: unknown }).gpu;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    try {
      Object.defineProperty(window.navigator, 'gpu', {
        value: originalNavigatorGpu,
        configurable: true,
        writable: true,
      });
    } catch {
      // Ignored in non-configurable environments
    }
  });

  it('handles browsers where navigator.gpu is undefined', async () => {
    Object.defineProperty(window.navigator, 'gpu', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const device = await initWebGPU();
    expect(device).toBeNull();

    const status = await checkWebGPUStatus();
    expect(status.supported).toBe(false);
    expect(status.hasAdapter).toBe(false);
    expect(status.reason).toContain('not available');
  });

  it('handles environments where no GPU adapter is available (requestAdapter returns null)', async () => {
    Object.defineProperty(window.navigator, 'gpu', {
      value: {
        requestAdapter: vi.fn().mockResolvedValue(null),
      },
      configurable: true,
      writable: true,
    });

    const device = await initWebGPU();
    expect(device).toBeNull();

    const status = await checkWebGPUStatus();
    expect(status.supported).toBe(true);
    expect(status.hasAdapter).toBe(false);
    expect(status.reason).toContain('No available graphics adapter found');
  });

  it('catches and handles adapter request exceptions gracefully without throwing', async () => {
    Object.defineProperty(window.navigator, 'gpu', {
      value: {
        requestAdapter: vi.fn().mockRejectedValue(new Error('GPU process crashed or no adapters available')),
      },
      configurable: true,
      writable: true,
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const device = await initWebGPU();
    expect(device).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WebGPU] Initialization handled gracefully:'),
      expect.any(Error)
    );

    const status = await checkWebGPUStatus();
    expect(status.supported).toBe(true);
    expect(status.hasAdapter).toBe(false);
    expect(status.reason).toBe('GPU process crashed or no adapters available');
  });

  it('returns device when GPU adapter and device are successfully created', async () => {
    const mockDevice = { id: 'mock-gpu-device' };
    const mockAdapter = {
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    };

    Object.defineProperty(window.navigator, 'gpu', {
      value: {
        requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      },
      configurable: true,
      writable: true,
    });

    const device = await initWebGPU();
    expect(device).toBe(mockDevice);

    const status = await checkWebGPUStatus();
    expect(status.supported).toBe(true);
    expect(status.hasAdapter).toBe(true);
  });
});
