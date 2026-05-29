import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { daysAgo, shortDate, today } from '../date';
import type { Settings } from '../../shared/types';
import { Field, Header, useToast } from './components';

type RangePreset = '7d' | '1m' | '1q' | 'advanced';

const rangePresets: Array<{ id: RangePreset; label: string; days?: number }> = [
  { id: '7d', label: 'Last week', days: 6 },
  { id: '1m', label: 'Last month', days: 30 },
  { id: '1q', label: 'Last quarter', days: 90 },
  { id: 'advanced', label: 'Advanced' }
];

export function ChartsScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const { data: points = [] } = useQuery({ queryKey: ['charts', from, to], queryFn: () => api.charts(from, to) });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.settings });
  const [settingsForm, setSettingsForm] = useState<Settings | null>(null);
  const form = settingsForm ?? settings;

  const saveSettings = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (updated) => {
      setSettingsForm(updated);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      showToast('Goals saved');
    }
  });

  const submitSettings = (event: FormEvent) => {
    event.preventDefault();
    if (form) saveSettings.mutate(form);
  };

  const chartData = points.map((point) => ({ ...point, label: shortDate(point.date) }));
  const showAdvancedDates = rangePreset === 'advanced';

  const selectPreset = (preset: RangePreset) => {
    setRangePreset(preset);
    const range = rangePresets.find((item) => item.id === preset);
    if (!range?.days) return;
    setFrom(daysAgo(range.days));
    setTo(today());
  };

  const updateCustomRange = (field: 'from' | 'to', value: string) => {
    setRangePreset('advanced');
    if (field === 'from') setFrom(value);
    if (field === 'to') setTo(value);
  };

  return (
    <>
      <Header title="Charts" subtitle="Watch your trends without the spreadsheet ritual." />

      <section className="panel date-range">
        <div className="range-preset-group" aria-label="Chart date range">
          {rangePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="range-preset-button"
              aria-pressed={rangePreset === preset.id}
              onClick={() => selectPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {showAdvancedDates ? (
          <div className="advanced-date-range">
            <Field label="From">
              <input
                type="date"
                value={from}
                onInput={(event) => updateCustomRange('from', event.currentTarget.value)}
                onChange={(event) => updateCustomRange('from', event.target.value)}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={to}
                onInput={(event) => updateCustomRange('to', event.currentTarget.value)}
                onChange={(event) => updateCustomRange('to', event.target.value)}
              />
            </Field>
          </div>
        ) : null}
      </section>

      <section className="panel chart-panel">
        <h2>Weight</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} width={34} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="#24745b" strokeWidth={3} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="panel chart-panel">
        <h2>Macros</h2>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis width={34} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="protein" stackId="1" stroke="#24745b" fill="#8ccfb8" />
            <Area type="monotone" dataKey="carbs" stackId="1" stroke="#9d6b28" fill="#f0c56d" />
            <Area type="monotone" dataKey="fat" stackId="1" stroke="#8b3f62" fill="#dda3b8" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="panel chart-panel">
        <h2>Calories</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis width={44} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="calories" stroke="#244b74" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {form ? (
        <form className="panel compact-form" onSubmit={submitSettings}>
          <h2>Goals</h2>
          <div className="two-col">
            <Field label="Calories"><input type="number" value={form.calorieGoal} onChange={(event) => setSettingsForm({ ...form, calorieGoal: Number(event.target.value) })} /></Field>
            <Field label="Protein"><input type="number" value={form.proteinGoal} onChange={(event) => setSettingsForm({ ...form, proteinGoal: Number(event.target.value) })} /></Field>
            <Field label="Carbs"><input type="number" value={form.carbsGoal} onChange={(event) => setSettingsForm({ ...form, carbsGoal: Number(event.target.value) })} /></Field>
            <Field label="Fat"><input type="number" value={form.fatGoal} onChange={(event) => setSettingsForm({ ...form, fatGoal: Number(event.target.value) })} /></Field>
          </div>
          <Field label="Weight unit">
            <select value={form.weightUnit} onChange={(event) => setSettingsForm({ ...form, weightUnit: event.target.value as Settings['weightUnit'] })}>
              <option value="lb">Pounds</option>
              <option value="kg">Kilograms</option>
            </select>
          </Field>
          <button className="primary-button" type="submit"><Save size={18} />Save goals</button>
        </form>
      ) : null}
    </>
  );
}
