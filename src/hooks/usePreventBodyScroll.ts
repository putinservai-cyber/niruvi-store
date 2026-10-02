import { useEffect } from 'react';

let activeScrollLockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

export function acquireBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (activeScrollLockCount === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      typeof window !== 'undefined'
        ? Math.max(0, window.innerWidth - document.documentElement.clientWidth)
        : 0;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  activeScrollLockCount += 1;
}

export function releaseBodyScrollLock(): void {
  if (typeof document === 'undefined') return;
  if (activeScrollLockCount <= 0) {
    activeScrollLockCount = 0;
    return;
  }
  activeScrollLockCount -= 1;
  if (activeScrollLockCount === 0) {
    document.body.style.overflow = savedOverflow || '';
    document.body.style.paddingRight = savedPaddingRight || '';
  }
}

export function getActiveScrollLockCount(): number {
  return activeScrollLockCount;
}

export function resetBodyScrollLocksForTesting(): void {
  activeScrollLockCount = 0;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

/**
 * Reference-counted body scroll lock hook so multiple stacked modals
 * never prematurely unlock background scrolling when one modal closes.
 */
export const usePreventBodyScroll = (isOpen: boolean): void => {
  useEffect(() => {
    if (!isOpen) return;
    acquireBodyScrollLock();
    return () => {
      releaseBodyScrollLock();
    };
  }, [isOpen]);
};
