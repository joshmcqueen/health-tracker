import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CalendarDays, ListPlus, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { ChangeEvent, FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { today } from '../date';
import { Field, Header, MacroBar, MacroPills, NumberInput, useToast } from './components';
import type { DirectFoodLogInput } from '../../shared/types';

type AiLogDraft = Omit<DirectFoodLogInput, 'date'> & {
  note: string;
  confidence: 'low' | 'medium' | 'high';
};

export function FoodScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [quickFoodId, setQuickFoodId] = useState('');
  const [quickMealId, setQuickMealId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [aiText, setAiText] = useState('');
  const [aiImageDataUrl, setAiImageDataUrl] = useState('');
  const [aiImageName, setAiImageName] = useState('');
  const [aiDraft, setAiDraft] = useState<AiLogDraft | null>(null);

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: api.settings });
  const { data: foods = [] } = useQuery({ queryKey: ['foods'], queryFn: api.foods });
  const { data: meals = [] } = useQuery({ queryKey: ['meals'], queryFn: api.meals });
  const { data: summary } = useQuery({ queryKey: ['summary', date], queryFn: () => api.dailySummary(date) });

  const invalidateFoodDay = () => {
    queryClient.invalidateQueries({ queryKey: ['foods'] });
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['charts'] });
  };

  const logFood = useMutation({
    mutationFn: api.logFood,
    onSuccess: () => {
      invalidateFoodDay();
      showToast('Food logged');
    }
  });

  const logDirectFood = useMutation({
    mutationFn: api.logDirectFood,
    onSuccess: () => {
      invalidateFoodDay();
      showToast('AI estimate logged');
      setAiDraft(null);
      setAiText('');
      setAiImageDataUrl('');
      setAiImageName('');
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Could not log estimate')
  });

  const estimateNutrition = useMutation({
    mutationFn: api.estimateNutrition,
    onSuccess: (estimate) => {
      setAiDraft({
        label: estimate.label,
        quantity: 1,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat,
        note: estimate.note,
        confidence: estimate.confidence
      });
      showToast('Estimate ready to review');
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Could not estimate nutrition')
  });

  const deleteLog = useMutation({
    mutationFn: api.deleteFoodLog,
    onSuccess: () => {
      invalidateFoodDay();
      showToast('Food log deleted');
    }
  });

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (quickFoodId) logFood.mutate({ date, foodId: Number(quickFoodId), quantity });
    if (quickMealId) logFood.mutate({ date, mealId: Number(quickMealId), quantity });
  };

  const estimateAiLog = (event: FormEvent) => {
    event.preventDefault();
    estimateNutrition.mutate({
      target: 'log',
      text: aiText || undefined,
      image: aiImageDataUrl ? { dataUrl: aiImageDataUrl } : undefined
    });
  };

  const submitAiDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!aiDraft) return;
    logDirectFood.mutate({ date, ...aiDraft });
  };

  const updateAiDraft = (patch: Partial<AiLogDraft>) => {
    if (aiDraft) setAiDraft({ ...aiDraft, ...patch });
  };

  const attachAiImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAiImageDataUrl(String(reader.result));
      setAiImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <Header title="Food" subtitle="Review and log the selected day." />

      <section className="panel daily-card">
        <div className="date-row">
          <CalendarDays size={18} />
          <input aria-label="Food log date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
        {summary && settings ? (
          <>
            <div className="calorie-hero">
              <span>Calories</span>
              <strong>{Math.round(summary.totals.calories)}</strong>
              <small>of {Math.round(settings.calorieGoal)}</small>
            </div>
            <MacroBar label="Protein" value={summary.totals.protein} goal={settings.proteinGoal} />
            <MacroBar label="Carbs" value={summary.totals.carbs} goal={settings.carbsGoal} />
            <MacroBar label="Fat" value={summary.totals.fat} goal={settings.fatGoal} />
          </>
        ) : null}
      </section>

      <form className="panel compact-form" onSubmit={submitLog}>
        <div className="form-heading">
          <h2>Quick log</h2>
          <div className="text-actions">
            <Link to="/foods"><ListPlus size={16} /> Foods</Link>
            <Link to="/meals"><Utensils size={16} /> Meals</Link>
          </div>
        </div>
        <Field label="Food">
          <select value={quickFoodId} onChange={(event) => { setQuickFoodId(event.target.value); setQuickMealId(''); }}>
            <option value="">Choose food</option>
            {foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}
          </select>
        </Field>
        <Field label="Meal">
          <select value={quickMealId} onChange={(event) => { setQuickMealId(event.target.value); setQuickFoodId(''); }}>
            <option value="">Choose meal</option>
            {meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}
          </select>
        </Field>
        <Field label="Servings">
          <NumberInput inputMode="decimal" step="any" min="0.01" value={quantity} onValueChange={setQuantity} />
        </Field>
        <button className="primary-button" type="submit" disabled={!quickFoodId && !quickMealId}>
          <Utensils size={18} />
          Log entry
        </button>
      </form>

      <section className="panel compact-form ai-panel">
        <div className="form-heading">
          <h2>AI estimate</h2>
          <Sparkles size={18} />
        </div>
        <form className="compact-form" onSubmit={estimateAiLog}>
          <Field label="Meal description">
            <textarea rows={3} value={aiText} onChange={(event) => setAiText(event.target.value)} placeholder="Sushi roll, miso soup, and edamame" />
          </Field>
          <label className="secondary-button file-button">
            <Camera size={18} />
            {aiImageName || 'Add photo'}
            <input type="file" accept="image/png,image/jpeg,image/webp" capture="environment" onChange={attachAiImage} />
          </label>
          {aiImageName ? (
            <button className="secondary-button" type="button" onClick={() => { setAiImageDataUrl(''); setAiImageName(''); }}>
              <X size={18} />
              Remove photo
            </button>
          ) : null}
          <button className="primary-button" type="submit" disabled={estimateNutrition.isPending || (!aiText && !aiImageDataUrl)}>
            <Sparkles size={18} />
            {estimateNutrition.isPending ? 'Estimating...' : 'Estimate macros'}
          </button>
        </form>

        {aiDraft ? (
          <form className="compact-form ai-review" onSubmit={submitAiDraft}>
            <div>
              <h2>Review estimate</h2>
              <p>{aiDraft.confidence} confidence · {aiDraft.note}</p>
            </div>
            <Field label="Label"><input value={aiDraft.label} onChange={(event) => updateAiDraft({ label: event.target.value })} required /></Field>
            <Field label="Servings"><NumberInput inputMode="decimal" step="any" min="0.01" value={aiDraft.quantity} onValueChange={(quantity) => updateAiDraft({ quantity })} /></Field>
            <div className="two-col">
              <Field label="Calories"><NumberInput inputMode="decimal" min="0" value={aiDraft.calories} emptyWhenZero onValueChange={(calories) => updateAiDraft({ calories })} /></Field>
              <Field label="Protein"><NumberInput inputMode="decimal" min="0" value={aiDraft.protein} emptyWhenZero onValueChange={(protein) => updateAiDraft({ protein })} /></Field>
              <Field label="Carbs"><NumberInput inputMode="decimal" min="0" value={aiDraft.carbs} emptyWhenZero onValueChange={(carbs) => updateAiDraft({ carbs })} /></Field>
              <Field label="Fat"><NumberInput inputMode="decimal" min="0" value={aiDraft.fat} emptyWhenZero onValueChange={(fat) => updateAiDraft({ fat })} /></Field>
            </div>
            <button className="primary-button" type="submit" disabled={logDirectFood.isPending}>
              <Utensils size={18} />
              {logDirectFood.isPending ? 'Logging...' : 'Log estimate'}
            </button>
          </form>
        ) : null}
      </section>

      <section className="list">
        {summary?.logs.length ? summary.logs.map((log) => (
          <article className="list-card" key={log.id}>
            <div>
              <strong>{log.label}</strong>
              <p>{log.quantity} serving{log.quantity === 1 ? '' : 's'}</p>
              <MacroPills totals={log} />
            </div>
            <button className="icon-button" type="button" aria-label="Delete food log" onClick={() => deleteLog.mutate(log.id)}>
              <Trash2 size={18} />
            </button>
          </article>
        )) : (
          <div className="empty-state">
            <strong>No food logged</strong>
            <p>This day is empty.</p>
          </div>
        )}
      </section>
    </>
  );
}
