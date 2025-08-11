import { useState } from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Toast) => {
    console.log(`Toast: ${title}${description ? ` - ${description}` : ""}`);
    
    // For now, just console.log the toast
    // In a full implementation, this would show a toast notification
    setToasts(prev => [...prev, { title, description, variant }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 5000);
  };

  return { toast, toasts };
}