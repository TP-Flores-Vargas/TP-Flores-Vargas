import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useId,
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
  const tooltipId = useId();

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

  const alignment =
    {
      left: "left-0",
      center: "left-1/2 -translate-x-1/2",
      right: "right-0",
    }[align] ?? "left-1/2 -translate-x-1/2";

  return (
    <span className={`relative inline-flex ${className}`}>
      {clonedChild}
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className={`absolute z-30 mt-2 px-3 py-2 rounded-xl bg-black/90 text-xs text-white shadow-xl whitespace-pre-line ${alignment}`}
        >
          {content}
        </span>
      )}
    </span>
  );
};
