import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  texto: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgBorder =
    toast.tipo === 'sucesso'
      ? 'bg-verde/10 border-verde/40 text-verde'
      : toast.tipo === 'erro'
      ? 'bg-vermelho/10 border-vermelho/40 text-vermelho'
      : 'bg-etiqueta border-mercosul/40 text-mercosul';

  const Icon =
    toast.tipo === 'sucesso'
      ? CheckCircle
      : toast.tipo === 'erro'
      ? AlertCircle
      : Info;

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border backdrop-blur-md  transition-all animate-slide-in ${bgBorder}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium leading-snug">{toast.texto}</div>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar aviso"
        className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
