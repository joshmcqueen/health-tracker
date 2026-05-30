import type { MacroTotals } from '../../shared/types';
import { CheckCircle2 } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

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

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
  emptyWhenZero?: boolean;
};

export function NumberInput({ value, onValueChange, emptyWhenZero = false, onBlur, step = 'any', ...props }: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toText = (nextValue: number) => emptyWhenZero && nextValue === 0 ? '' : String(nextValue);
  const [text, setText] = useState(toText(value));

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setText(toText(value));
    }
  }, [emptyWhenZero, value]);

  return (
    <input
      {...props}
      ref={inputRef}
      type="number"
      step={step}
      value={text}
      onChange={(event) => {
        const nextText = event.target.value;
        setText(nextText);
        const nextValue = Number(nextText);
        if (nextText !== '' && !Number.isNaN(nextValue)) {
          onValueChange(nextValue);
        }
      }}
      onBlur={(event) => {
        if (text === '') {
          setText(toText(value));
        } else {
          const nextValue = Number(text);
          if (Number.isNaN(nextValue)) {
            setText(toText(value));
          } else {
            onValueChange(nextValue);
            setText(toText(nextValue));
          }
        }
        onBlur?.(event);
      }}
    />
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
