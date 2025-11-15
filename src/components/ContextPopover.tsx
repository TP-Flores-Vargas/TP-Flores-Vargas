import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface Props {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const ContextPopover = ({
  triggerLabel,
  title,
  description,
  children,
  className = "",
}: Props) => {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  return (
    <div className={`inline-flex ${className}`}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:text-white"
        aria-expanded={open}
        onClick={toggle}
      >
        {triggerLabel}
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              className="absolute inset-0"
              aria-hidden
              onClick={close}
            />
            <div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-sm text-gray-200 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-base font-semibold text-white">{title}</p>
                  {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
                </div>
                <button
                  type="button"
                  className="text-xs font-semibold text-gray-400 hover:text-white"
                  onClick={close}
                >
                  Cerrar
                </button>
              </div>
              <div className="space-y-3 text-xs text-gray-200">{children}</div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
