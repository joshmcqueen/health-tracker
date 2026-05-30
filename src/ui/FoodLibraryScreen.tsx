import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { Food } from '../../shared/types';
import { Field, Header, NumberInput, useToast } from './components';

type FoodForm = Omit<Food, 'id' | 'createdAt'>;

const emptyFood: FoodForm = {
  name: '',
  servingQty: 1,
  servingUnit: 'serving',
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
};

export function FoodLibraryScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [foodForm, setFoodForm] = useState<FoodForm>(emptyFood);
  const [editingFoodId, setEditingFoodId] = useState<number | null>(null);
  const [aiLookupText, setAiLookupText] = useState('');
  const [aiLookupNote, setAiLookupNote] = useState('');

  const { data: foods = [] } = useQuery({ queryKey: ['foods'], queryFn: api.foods });

  const invalidateFoodData = () => {
    queryClient.invalidateQueries({ queryKey: ['foods'] });
    queryClient.invalidateQueries({ queryKey: ['meals'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['charts'] });
  };

  const createFood = useMutation({
    mutationFn: api.createFood,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['foods'] });
      showToast('Food saved');
      setFoodForm(emptyFood);
    }
  });

  const updateFood = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FoodForm }) => api.updateFood(id, body),
    onSuccess: () => {
      invalidateFoodData();
      showToast('Food updated');
      setFoodForm(emptyFood);
      setEditingFoodId(null);
    }
  });

  const deleteFood = useMutation({
    mutationFn: api.deleteFood,
    onSuccess: (_data, deletedId) => {
      invalidateFoodData();
      showToast('Food deleted');
      if (editingFoodId === deletedId) {
        setFoodForm(emptyFood);
        setEditingFoodId(null);
      }
    }
  });

  const estimateFood = useMutation({
    mutationFn: api.estimateNutrition,
    onSuccess: (estimate) => {
      setFoodForm({
        name: estimate.label,
        servingQty: estimate.servingQty,
        servingUnit: estimate.servingUnit,
        calories: estimate.calories,
        protein: estimate.protein,
        carbs: estimate.carbs,
        fat: estimate.fat
      });
      setAiLookupNote(`${estimate.confidence} confidence · ${estimate.note}`);
      setEditingFoodId(null);
      showToast('Food details ready to review');
    },
    onError: (error) => showToast(error instanceof Error ? error.message : 'Could not estimate food')
  });

  const submitFood = (event: FormEvent) => {
    event.preventDefault();
    const body = {
      ...foodForm,
      servingUnit: foodForm.servingUnit.trim() || emptyFood.servingUnit
    };
    if (editingFoodId) {
      updateFood.mutate({ id: editingFoodId, body });
    } else {
      createFood.mutate(body);
    }
  };

  const submitAiLookup = (event: FormEvent) => {
    event.preventDefault();
    estimateFood.mutate({ target: 'food', text: aiLookupText });
  };

  const editFood = (food: Food) => {
    setEditingFoodId(food.id);
    setFoodForm({
      name: food.name,
      servingQty: food.servingQty,
      servingUnit: food.servingUnit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat
    });
  };

  const cancelFoodEdit = () => {
    setEditingFoodId(null);
    setFoodForm(emptyFood);
  };

  return (
    <>
      <Header title="Foods" subtitle="Add and edit saved foods." />

      <section className="panel compact-form ai-panel">
        <div className="form-heading">
          <h2>AI food lookup</h2>
          <Sparkles size={18} />
        </div>
        <form className="compact-form" onSubmit={submitAiLookup}>
          <Field label="Food">
            <input value={aiLookupText} onChange={(event) => setAiLookupText(event.target.value)} placeholder="nectarine" />
          </Field>
          <button className="primary-button" type="submit" disabled={estimateFood.isPending || !aiLookupText.trim()}>
            <Sparkles size={18} />
            {estimateFood.isPending ? 'Looking up...' : 'Fill food form'}
          </button>
        </form>
        {aiLookupNote ? <p className="ai-note">{aiLookupNote}</p> : null}
      </section>

      <form className="panel compact-form" onSubmit={submitFood}>
        <div className="form-heading">
          <h2>{editingFoodId ? 'Edit food' : 'Add food'}</h2>
          {editingFoodId ? (
            <button className="icon-button" type="button" aria-label="Cancel food edit" onClick={cancelFoodEdit}>
              <X size={18} />
            </button>
          ) : null}
        </div>
        <Field label="Name"><input value={foodForm.name} onChange={(event) => setFoodForm({ ...foodForm, name: event.target.value })} required /></Field>
        <div className="two-col">
          <Field label="Serving amount"><NumberInput inputMode="decimal" step="any" min="0.01" value={foodForm.servingQty} onValueChange={(servingQty) => setFoodForm({ ...foodForm, servingQty })} /></Field>
          <Field label="Unit">
            <input
              value={foodForm.servingUnit}
              onFocus={() => setFoodForm({ ...foodForm, servingUnit: '' })}
              onBlur={() => setFoodForm((current) => ({ ...current, servingUnit: current.servingUnit.trim() || emptyFood.servingUnit }))}
              onChange={(event) => setFoodForm({ ...foodForm, servingUnit: event.target.value })}
            />
          </Field>
        </div>
        <div className="two-col">
          <Field label="Calories"><NumberInput inputMode="decimal" min="0" value={foodForm.calories} emptyWhenZero onValueChange={(calories) => setFoodForm({ ...foodForm, calories })} /></Field>
          <Field label="Protein"><NumberInput inputMode="decimal" min="0" value={foodForm.protein} emptyWhenZero onValueChange={(protein) => setFoodForm({ ...foodForm, protein })} /></Field>
          <Field label="Carbs"><NumberInput inputMode="decimal" min="0" value={foodForm.carbs} emptyWhenZero onValueChange={(carbs) => setFoodForm({ ...foodForm, carbs })} /></Field>
          <Field label="Fat"><NumberInput inputMode="decimal" min="0" value={foodForm.fat} emptyWhenZero onValueChange={(fat) => setFoodForm({ ...foodForm, fat })} /></Field>
        </div>
        <button className="primary-button" type="submit">
          {editingFoodId ? <Pencil size={18} /> : <Plus size={18} />}
          {editingFoodId ? 'Update food' : 'Save food'}
        </button>
      </form>

      <section className="panel">
        <h2>Saved foods</h2>
        {foods.map((food) => (
          <article className="mini-row" key={food.id}>
            <div>
              <strong>{food.name}</strong>
              <p>{food.servingQty} {food.servingUnit} · {food.calories} cal</p>
            </div>
            <div className="icon-actions">
              <button className="icon-button" aria-label={`Edit ${food.name}`} type="button" onClick={() => editFood(food)}><Pencil size={16} /></button>
              <button className="icon-button" aria-label={`Delete ${food.name}`} type="button" onClick={() => deleteFood.mutate(food.id)}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
