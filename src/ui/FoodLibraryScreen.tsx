import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { Food } from '../../shared/types';
import { Field, Header, useToast } from './components';

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

  const submitFood = (event: FormEvent) => {
    event.preventDefault();
    if (editingFoodId) {
      updateFood.mutate({ id: editingFoodId, body: foodForm });
    } else {
      createFood.mutate(foodForm);
    }
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
          <Field label="Serving amount"><input type="number" step="0.1" min="0.01" value={foodForm.servingQty} onChange={(event) => setFoodForm({ ...foodForm, servingQty: Number(event.target.value) })} /></Field>
          <Field label="Unit"><input value={foodForm.servingUnit} onChange={(event) => setFoodForm({ ...foodForm, servingUnit: event.target.value })} /></Field>
        </div>
        <div className="two-col">
          <Field label="Calories"><input type="number" min="0" value={foodForm.calories} onChange={(event) => setFoodForm({ ...foodForm, calories: Number(event.target.value) })} /></Field>
          <Field label="Protein"><input type="number" min="0" value={foodForm.protein} onChange={(event) => setFoodForm({ ...foodForm, protein: Number(event.target.value) })} /></Field>
          <Field label="Carbs"><input type="number" min="0" value={foodForm.carbs} onChange={(event) => setFoodForm({ ...foodForm, carbs: Number(event.target.value) })} /></Field>
          <Field label="Fat"><input type="number" min="0" value={foodForm.fat} onChange={(event) => setFoodForm({ ...foodForm, fat: Number(event.target.value) })} /></Field>
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
