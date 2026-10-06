"use client";

import { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = "error",
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const styles = {
    error: "bg-red-950/90 border-red-500/50 text-red-200",
    success: "bg-emerald-950/90 border-emerald-500/50 text-emerald-200",
    info: "bg-blue-950/90 border-blue-500/50 text-blue-200",
  };

  const icons = {
    error: "⚠️",
    success: "✅",
    info: "ℹ️",
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-300">
      <div
        className={`flex items-center gap-2.5 ${styles[type]} p-1 rounded-lg`}
      >
        <span className="text-base">{icons[type]}</span>
        <p className="text-xs font-medium pr-2">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white text-xs p-1 transition-colors cursor-pointer"
      >
        ✕
      </button>
    </div>
  );
}
