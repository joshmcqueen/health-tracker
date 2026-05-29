import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Trash2, Utensils } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api';
import { today } from '../date';
import type { Food, Meal } from '../../shared/types';
import { Field, Header, MacroBar, MacroPills } from './components';

type FoodForm = Omit<Food, 'id' | 'createdAt'>;

const emptyFood: FoodForm = {
  name: '',
  brand: null,
  servingQty: 1,
  servingUnit: 'serving',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

export function FoodScreen() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [foodForm, setFoodForm] = useState<FoodForm>(emptyFood);
  const [mealName, setMealName] = useState('');
  const [mealItems, setMealItems] = useState<Array<{ foodId: number; quantity: number }>>([]);
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

  const createFood = useMutation({
    mutationFn: api.createFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      setFoodForm(emptyFood);
    }
  });

  const createMeal = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      setMealName('');
      setMealItems([]);
    }
  });

  const logFood = useMutation({
    mutationFn: api.logFood,
    onSuccess: invalidateFoodDay
  });

  const deleteLog = useMutation({
    mutationFn: api.deleteFoodLog,
    onSuccess: invalidateFoodDay
  });

  const deleteFood = useMutation({
    mutationFn: api.deleteFood,
    onSuccess: invalidateFoodDay
  });

  const deleteMeal = useMutation({
    mutationFn: api.deleteMeal,
    onSuccess: invalidateFoodDay
  });

  const selectedMealItems = useMemo(() => mealItems.filter((item) => item.foodId), [mealItems]);

  const submitFood = (event: FormEvent) => {
    event.preventDefault();
    createFood.mutate(foodForm);
  };

  const submitMeal = (event: FormEvent) => {
    event.preventDefault();
    createMeal.mutate({ name: mealName, items: selectedMealItems });
  };

  const submitLog = (event: FormEvent) => {
    event.preventDefault();
    if (quickFoodId) logFood.mutate({ date, foodId: Number(quickFoodId), quantity });
    if (quickMealId) logFood.mutate({ date, mealId: Number(quickMealId), quantity });
  };

  return (
    <>
      <Header title="Food" subtitle="Log today, save staples, and reuse meals." />

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
        <h2>Quick log</h2>
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
        {summary?.logs.map((log) => (
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
        ))}
      </section>

      <form className="panel compact-form" onSubmit={submitFood}>
        <h2>Add food</h2>
        <Field label="Name"><input value={foodForm.name} onChange={(event) => setFoodForm({ ...foodForm, name: event.target.value })} required /></Field>
        <Field label="Brand"><input value={foodForm.brand ?? ''} onChange={(event) => setFoodForm({ ...foodForm, brand: event.target.value || null })} /></Field>
        <div className="two-col">
          <Field label="Serving amount"><input type="number" step="0.1" min="0.01" value={foodForm.servingQty} onChange={(event) => setFoodForm({ ...foodForm, servingQty: Number(event.target.value) })} /></Field>
          <Field label="Unit"><input value={foodForm.servingUnit} onChange={(event) => setFoodForm({ ...foodForm, servingUnit: event.target.value })} /></Field>
        </div>
        <div className="two-col">
          <Field label="Calories"><input type="number" min="0" value={foodForm.calories} onChange={(event) => setFoodForm({ ...foodForm, calories: Number(event.target.value) })} /></Field>
          <Field label="Protein"><input type="number" min="0" value={foodForm.protein} onChange={(event) => setFoodForm({ ...foodForm, protein: Number(event.target.value) })} /></Field>
          <Field label="Carbs"><input type="number" min="0" value={foodForm.carbs} onChange={(event) => setFoodForm({ ...foodForm, carbs: Number(event.target.value) })} /></Field>
          <Field label="Fat"><input type="number" min="0" value={foodForm.fat} onChange={(event) => setFoodForm({ ...foodForm, fat: Number(event.target.value) })} /></Field>
        </div>
        <button className="primary-button" type="submit"><Plus size={18} />Save food</button>
      </form>

      <form className="panel compact-form" onSubmit={submitMeal}>
        <h2>Build meal</h2>
        <Field label="Meal name"><input value={mealName} onChange={(event) => setMealName(event.target.value)} required /></Field>
        {mealItems.map((item, index) => (
          <div className="meal-builder-row" key={index}>
            <select aria-label="Meal item food" value={item.foodId || ''} onChange={(event) => {
              const next = [...mealItems];
              next[index] = { ...item, foodId: Number(event.target.value) };
              setMealItems(next);
            }}>
              <option value="">Food</option>
              {foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}
            </select>
            <input aria-label="Meal item servings" type="number" step="0.25" min="0.01" value={item.quantity} onChange={(event) => {
              const next = [...mealItems];
              next[index] = { ...item, quantity: Number(event.target.value) };
              setMealItems(next);
            }} />
            <button type="button" className="icon-button" aria-label="Remove meal item" onClick={() => setMealItems(mealItems.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <button type="button" className="secondary-button" onClick={() => setMealItems([...mealItems, { foodId: foods[0]?.id ?? 0, quantity: 1 }])}>
          <Plus size={18} />
          Add item
        </button>
        <button className="primary-button" type="submit" disabled={!mealName || selectedMealItems.length === 0}>Save meal</button>
      </form>

      <section className="library-grid">
        <div className="panel">
          <h2>Foods</h2>
          {foods.map((food) => (
            <article className="mini-row" key={food.id}>
              <div>
                <strong>{food.name}</strong>
                <p>{food.servingQty} {food.servingUnit}</p>
              </div>
              <button className="icon-button" aria-label="Delete food" type="button" onClick={() => deleteFood.mutate(food.id)}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
        <div className="panel">
          <h2>Meals</h2>
          {meals.map((meal: Meal) => (
            <article className="mini-row" key={meal.id}>
              <div>
                <strong>{meal.name}</strong>
                <MacroPills totals={meal.totals} />
              </div>
              <button className="icon-button" aria-label="Delete meal" type="button" onClick={() => deleteMeal.mutate(meal.id)}><Trash2 size={16} /></button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
