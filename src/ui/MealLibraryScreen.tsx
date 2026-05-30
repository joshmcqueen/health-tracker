import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { api } from '../api';
import type { Meal } from '../../shared/types';
import { Field, Header, MacroPills, NumberInput, useToast } from './components';

export function MealLibraryScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [mealName, setMealName] = useState('');
  const [mealItems, setMealItems] = useState<Array<{ foodId: number; quantity: number }>>([]);
  const [editingMealId, setEditingMealId] = useState<number | null>(null);

  const { data: foods = [] } = useQuery({ queryKey: ['foods'], queryFn: api.foods });
  const { data: meals = [] } = useQuery({ queryKey: ['meals'], queryFn: api.meals });

  const selectedMealItems = useMemo(() => mealItems.filter((item) => item.foodId), [mealItems]);

  const resetMealForm = () => {
    setMealName('');
    setMealItems([]);
    setEditingMealId(null);
  };

  const invalidateMealData = () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['charts'] });
  };

  const createMeal = useMutation({
    mutationFn: api.createMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      showToast('Meal saved');
      resetMealForm();
    }
  });

  const updateMeal = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { name: string; items: Array<{ foodId: number; quantity: number }> } }) => api.updateMeal(id, body),
    onSuccess: () => {
      invalidateMealData();
      showToast('Meal updated');
      resetMealForm();
    }
  });

  const deleteMeal = useMutation({
    mutationFn: api.deleteMeal,
    onSuccess: (_data, deletedId) => {
      invalidateMealData();
      showToast('Meal deleted');
      if (editingMealId === deletedId) resetMealForm();
    }
  });

  const submitMeal = (event: FormEvent) => {
    event.preventDefault();
    const body = { name: mealName, items: selectedMealItems };
    if (editingMealId) {
      updateMeal.mutate({ id: editingMealId, body });
    } else {
      createMeal.mutate(body);
    }
  };

  const editMeal = (meal: Meal) => {
    setEditingMealId(meal.id);
    setMealName(meal.name);
    setMealItems(meal.items.map((item) => ({ foodId: item.foodId, quantity: item.quantity })));
  };

  return (
    <>
      <Header title="Meals" subtitle="Create and manage reusable meals." />

      <form className="panel compact-form" onSubmit={submitMeal}>
        <div className="form-heading">
          <h2>{editingMealId ? 'Edit meal' : 'Build meal'}</h2>
          {editingMealId ? (
            <button className="icon-button" type="button" aria-label="Cancel meal edit" onClick={resetMealForm}>
              <X size={18} />
            </button>
          ) : null}
        </div>
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
            <NumberInput aria-label="Meal item servings" inputMode="numeric" min="1" step={1} value={item.quantity} onValueChange={(quantity) => {
              const next = [...mealItems];
              next[index] = { ...item, quantity };
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
        <button className="primary-button" type="submit" disabled={!mealName || selectedMealItems.length === 0}>
          {editingMealId ? <Pencil size={18} /> : <Plus size={18} />}
          {editingMealId ? 'Update meal' : 'Save meal'}
        </button>
      </form>

      <section className="panel">
        <h2>Saved meals</h2>
        {meals.map((meal: Meal) => (
          <article className="mini-row" key={meal.id}>
            <div>
              <strong>{meal.name}</strong>
              <MacroPills totals={meal.totals} />
            </div>
            <div className="icon-actions">
              <button className="icon-button" aria-label={`Edit ${meal.name}`} type="button" onClick={() => editMeal(meal)}><Pencil size={16} /></button>
              <button className="icon-button" aria-label={`Delete ${meal.name}`} type="button" onClick={() => deleteMeal.mutate(meal.id)}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
