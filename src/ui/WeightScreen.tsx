import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../api';
import { readableDate, today } from '../date';
import type { WeightLog } from '../../shared/types';
import { Field, Header, useToast } from './components';

type WeightForm = Pick<WeightLog, 'date' | 'weight' | 'note'>;

const blankForm = (): WeightForm => ({ date: today(), weight: 0, note: null });

export function WeightScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: logs = [] } = useQuery({ queryKey: ['weight-logs'], queryFn: api.weightLogs });
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.settings });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WeightForm>(blankForm());

  const save = useMutation({
    mutationFn: () => editingId ? api.updateWeightLog(editingId, form) : api.createWeightLog(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      showToast(editingId ? 'Weigh-in updated' : 'Weigh-in added');
      setEditingId(null);
      setForm(blankForm());
    }
  });

  const remove = useMutation({
    mutationFn: api.deleteWeightLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      queryClient.invalidateQueries({ queryKey: ['charts'] });
      showToast('Weigh-in deleted');
    }
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const startEdit = (log: WeightLog) => {
    setEditingId(log.id);
    setForm({ date: log.date, weight: log.weight, note: log.note });
  };

  return (
    <>
      <Header title="Weight" subtitle="Track daily weigh-ins and quick notes." />
      <form className="panel form-grid" onSubmit={submit}>
        <Field label="Date">
          <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        </Field>
        <Field label={`Weight (${settings?.weightUnit ?? 'lb'})`}>
          <input inputMode="decimal" type="number" step="0.1" value={form.weight || ''} onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })} required />
        </Field>
        <Field label="Note">
          <input value={form.note ?? ''} onChange={(event) => setForm({ ...form, note: event.target.value || null })} placeholder="Optional" />
        </Field>
        <button className="primary-button" type="submit">
          <Plus size={18} />
          {editingId ? 'Save weigh-in' : 'Add weigh-in'}
        </button>
      </form>

      <section className="list">
        {logs.map((log) => (
          <article className="list-card" key={log.id}>
            <div>
              <strong>{log.weight.toFixed(1)} {settings?.weightUnit ?? 'lb'}</strong>
              <p>{readableDate(log.date)}{log.note ? ` · ${log.note}` : ''}</p>
            </div>
            <div className="icon-actions">
              <button type="button" aria-label="Edit weight log" onClick={() => startEdit(log)}><Edit3 size={18} /></button>
              <button type="button" aria-label="Delete weight log" onClick={() => remove.mutate(log.id)}><Trash2 size={18} /></button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
