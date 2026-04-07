import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import type { ToastType } from "../../context/ToastContext";

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const styles: Record<ToastType, string> = {
  success: "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300",
  error:   "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300",
  warning: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300",
  info:    "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300",
};

const iconStyles: Record<ToastType, string> = {
  success: "text-green-500",
  error:   "text-red-500",
  warning: "text-amber-500",
  info:    "text-blue-500",
};

export default function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${styles[t.type]} ${t.exiting ? "toast-exit" : "toast-enter"}`}
          >
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconStyles[t.type]}`} />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="touch-target flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity -mr-1 -mt-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
