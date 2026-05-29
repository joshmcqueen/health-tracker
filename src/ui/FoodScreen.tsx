import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ListPlus, Trash2, Utensils } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { today } from '../date';
import { Field, Header, MacroBar, MacroPills } from './components';

export function FoodScreen() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [quickFoodId, setQuickFoodId] = useState('');
  const [quickMealId, setQuickMealId] = useState('');
  const [quantity, setQuantity] = useState(1);

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
    onSuccess: invalidateFoodDay
  });

  const deleteLog = useMutation({
    mutationFn: api.deleteFoodLog,
    onSuccess: invalidateFoodDay
  });

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (quickFoodId) logFood.mutate({ date, foodId: Number(quickFoodId), quantity });
    if (quickMealId) logFood.mutate({ date, mealId: Number(quickMealId), quantity });
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
          <input type="number" inputMode="decimal" step="0.25" min="0.01" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
        </Field>
        <button className="primary-button" type="submit" disabled={!quickFoodId && !quickMealId}>
          <Utensils size={18} />
          Log entry
        </button>
      </form>

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
