import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      const t = setTimeout(() => setShow(false), 200);
      document.body.style.overflow = "";
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open && !show) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200 ${
        open ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-[390px] bg-ink-surface rounded-t-3xl shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-8"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-border">
          <h3 className="text-base font-bold text-txt">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-txt-muted hover:bg-ink-card hover:text-txt transition"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
