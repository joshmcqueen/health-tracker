// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type AppDatabase } from '../server/db';
import { createRepository } from '../server/repository';

let db: AppDatabase;
let repo: ReturnType<typeof createRepository>;

beforeEach(() => {
  db = createDatabase(':memory:');
  repo = createRepository(db);
});

afterEach(() => {
  db.close();
});

describe('health tracker backend', () => {
  it('creates, edits, and deletes weight logs', () => {
    const created = repo.createWeightLog({ date: '2026-05-29', weight: 201.4, note: 'morning' });
    expect(created.weight).toBe(201.4);

    const updated = repo.updateWeightLog(created.id, { date: '2026-05-29', weight: 200.8, note: 'after walk' });
    expect(updated).toMatchObject({ weight: 200.8, note: 'after walk' });

    expect(repo.deleteWeightLog(created.id)).toBe(1);
    expect(repo.listWeightLogs()).toHaveLength(0);
  });

  it('scales food nutrition when logging servings', () => {
    const food = repo.createFood({ name: 'Greek yogurt', brand: 'House', servingQty: 170, servingUnit: 'g', calories: 100, protein: 17, carbs: 6, fat: 0 });
    repo.logFood({ date: '2026-05-29', foodId: food.id, quantity: 1.5 });

    expect(repo.getDailySummary('2026-05-29').totals).toEqual({ calories: 150, protein: 25.5, carbs: 9, fat: 0 });
  });

  it('creates meals and logs meal snapshots', () => {
    const rice = repo.createFood({ name: 'Rice', brand: null, servingQty: 1, servingUnit: 'cup', calories: 205, protein: 4, carbs: 45, fat: 0.4 });
    const chicken = repo.createFood({ name: 'Chicken', brand: null, servingQty: 4, servingUnit: 'oz', calories: 180, protein: 34, carbs: 0, fat: 4 });

    const meal = repo.createMeal({ name: 'Lunch bowl', items: [{ foodId: rice.id, quantity: 1 }, { foodId: chicken.id, quantity: 2 }] });
    expect(meal.totals).toEqual({ calories: 565, protein: 72, carbs: 45, fat: 8.4 });

    repo.logFood({ date: '2026-05-29', mealId: meal.id, quantity: 0.5 });
    expect(repo.getDailySummary('2026-05-29').totals).toEqual({ calories: 282.5, protein: 36, carbs: 22.5, fat: 4.2 });
  });

  it('aggregates chart ranges across weight and food', () => {
    repo.createWeightLog({ date: '2026-05-28', weight: 202, note: null });
    const food = repo.createFood({ name: 'Eggs', brand: null, servingQty: 2, servingUnit: 'eggs', calories: 140, protein: 12, carbs: 1, fat: 10 });
    repo.logFood({ date: '2026-05-28', foodId: food.id, quantity: 2 });

    expect(repo.getChartPoints('2026-05-01', '2026-05-31')).toEqual([
      { date: '2026-05-28', weight: 202, calories: 280, protein: 24, carbs: 2, fat: 20 }
    ]);
  });
});
