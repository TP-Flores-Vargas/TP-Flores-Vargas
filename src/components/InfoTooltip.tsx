import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface Props {
  content: ReactNode;
  children: ReactElement;
  align?: "left" | "center" | "right";
  className?: string;
}

export const InfoTooltip = ({ content, children, align = "center", className = "" }: Props) => {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const handleShow = () => setOpen(true);
  const handleHide = () => setOpen(false);

  const clonedChild = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": open ? tooltipId : undefined,
        onFocus: (event: React.FocusEvent) => {
          children.props?.onFocus?.(event);
          handleShow();
        },
        onBlur: (event: React.FocusEvent) => {
          children.props?.onBlur?.(event);
          handleHide();
        },
        onMouseEnter: (event: React.MouseEvent) => {
          children.props?.onMouseEnter?.(event);
          handleShow();
        },
        onMouseLeave: (event: React.MouseEvent) => {
          children.props?.onMouseLeave?.(event);
          handleHide();
        },
      })
    : children;

  const alignment = {
    left: { left: "0%", translate: "0%" },
    center: { left: "50%", translate: "-50%" },
    right: { left: "100%", translate: "-100%" },
  }[align] ?? { left: "50%", translate: "-50%" };

  useLayoutEffect(() => {
    if (!open || !tooltipRef.current) {
      setShift(0);
      return;
    }
    const rect = tooltipRef.current.getBoundingClientRect();
    const padding = 12;
    let delta = 0;
    if (rect.left < padding) {
      delta = padding - rect.left;
    } else if (rect.right > window.innerWidth - padding) {
      delta = window.innerWidth - padding - rect.right;
    }
    setShift(delta);
  }, [open, align]);

  return (
    <span className={`relative inline-flex ${className}`} ref={wrapperRef}>
      {clonedChild}
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          onMouseEnter={handleShow}
          onMouseLeave={handleHide}
          ref={tooltipRef}
          style={{
            left: alignment.left,
            transform: `translateX(calc(${alignment.translate} + ${shift}px))`,
          }}
          className="pointer-events-auto absolute z-30 mt-2 w-64 max-w-xs rounded-2xl border border-white/10 bg-black/90 px-4 py-3 text-left text-[13px] leading-snug text-white shadow-2xl"
        >
          {content}
        </span>
      )}
    </span>
  );
};
