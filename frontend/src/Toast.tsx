
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

export function showToast(
  message: string,
  type: ToastType = "success"
) {
  window.dispatchEvent(
    new CustomEvent("chaimint-toast", {
      detail: { message, type },
    })
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<{
        message: string;
        type: ToastType;
      }>;

      const id = Date.now() + Math.random();

      setToasts((current) => [
        ...current,
        { id, ...customEvent.detail },
      ]);

      window.setTimeout(() => {
        setToasts((current) =>
          current.filter((toast) => toast.id !== id)
        );
      }, 3000);
    }

    window.addEventListener("chaimint-toast", handleToast);

    return () => {
      window.removeEventListener("chaimint-toast", handleToast);
    };
  }, []);

  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`rounded-xl border p-4 text-sm font-semibold shadow-2xl backdrop-blur ${
            toast.type === "success"
              ? "border-emerald-500 bg-emerald-950 text-emerald-200"
              : toast.type === "error"
                ? "border-red-500 bg-red-950 text-red-200"
                : "border-sky-500 bg-sky-950 text-sky-200"
          }`}
        >
          {toast.type === "success"
            ? "✓ "
            : toast.type === "error"
              ? "⚠ "
              : "ℹ "}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
