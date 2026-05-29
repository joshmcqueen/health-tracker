import type { MacroTotals } from '../../shared/types';
import { CheckCircle2 } from 'lucide-react';
import { createContext, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type Toast = {
  id: number;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);

  const value = useMemo<ToastContextValue>(() => ({
    showToast: (message: string) => {
      nextToastId.current += 1;
      const id = nextToastId.current;
      setToasts((current) => [...current, { id, message }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3200);
    }
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id} role="status">
            <CheckCircle2 size={18} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function MacroBar({ label, value, goal, unit = 'g' }: { label: string; value: number; goal: number; unit?: string }) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div className="macro-row">
      <div className="macro-label">
        <span>{label}</span>
        <strong>{Math.round(value)} / {Math.round(goal)}{unit}</strong>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function MacroPills({ totals }: { totals: MacroTotals }) {
  return (
    <div className="macro-pills">
      <span>{Math.round(totals.calories)} cal</span>
      <span>{Math.round(totals.protein)}p</span>
      <span>{Math.round(totals.carbs)}c</span>
      <span>{Math.round(totals.fat)}f</span>
    </div>
  );
}
