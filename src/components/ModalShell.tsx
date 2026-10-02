import React, { useEffect, useRef } from 'react';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy?: string;
  ariaLabel?: string;
  maxWidthClass?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  disableClose?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Reusable ModalShell component providing:
 * - Fixed viewport overlay & z-index
 * - Reference-counted body scroll lock (prevents background scrolling and layout shift)
 * - Internal content scrolling (`max-h-[calc(100vh-2rem)] overflow-y-auto`)
 * - Escape key to close & click outside to close
 * - Focus trap and previous focus restoration
 */
export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  labelledBy,
  ariaLabel,
  maxWidthClass = 'max-w-lg',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  disableClose = false,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  usePreventBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape && !disableClose) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        try {
          previousFocusRef.current.focus();
        } catch {
          // Ignore focus restore error if element was unmounted
        }
      }
    };
  }, [isOpen, closeOnEscape, disableClose, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={!labelledBy ? ariaLabel : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdropClick && !disableClose) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} max-h-[calc(100vh-2rem)] flex flex-col bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden`}
      >
        {children}
      </div>
    </div>
  );
};
