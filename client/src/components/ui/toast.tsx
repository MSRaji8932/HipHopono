"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle, AlertTriangle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const toast: Toast = { id, type, message, duration };
      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success" />,
    error: <X className="w-5 h-5 text-danger" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning" />,
    info: <Info className="w-5 h-5 text-accent" />,
  };

  const borders = {
    success: "border-success/30",
    error: "border-danger/30",
    warning: "border-warning/30",
    info: "border-accent/30",
  };

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-bg-secondary border ${borders[toast.type]} rounded-lg shadow-lg animate-slide-up`}
    >
      {icons[toast.type]}
      <span className="text-sm text-text flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-text-muted hover:text-text transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
