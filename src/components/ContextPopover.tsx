import {
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

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
  const popoverId = useId();
  const ref = useRef<HTMLDivElement | null>(null);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className={`relative inline-flex ${className}`} ref={ref}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:text-white"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={toggle}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          role="dialog"
          id={popoverId}
          className="absolute z-40 mt-2 w-80 rounded-2xl border border-white/5 bg-slate-900/95 p-4 text-sm text-gray-200 shadow-2xl backdrop-blur"
        >
          <div className="mb-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            {description && <p className="text-xs text-gray-400">{description}</p>}
          </div>
          <div className="space-y-2 text-xs text-gray-200">{children}</div>
        </div>
      )}
    </div>
  );
};
