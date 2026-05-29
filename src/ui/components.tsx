import type { MacroTotals } from '../../shared/types';
import type { ReactNode } from 'react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="header">
      <div>
        <p className="eyebrow">Health Tracker</p>
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
