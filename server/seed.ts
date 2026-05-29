import { createDatabase } from './db.ts';
import { createRepository } from './repository.ts';

const db = createDatabase();
const repo = createRepository(db);

const today = new Date();
const isoDate = (daysAgo: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

function upsertFood(input: Parameters<typeof repo.createFood>[0]) {
  const existing = repo.listFoods().find((food) => food.name === input.name && food.brand === input.brand);
  return existing ?? repo.createFood(input);
}

function safeWeightLog(date: string, weight: number, note: string | null = null) {
  const existing = repo.listWeightLogs().find((log) => log.date === date);
  if (existing) return repo.updateWeightLog(existing.id, { date, weight, note });
  return repo.createWeightLog({ date, weight, note });
}

function recreateMeal(name: string, items: Array<{ foodId: number; quantity: number }>) {
  const existing = repo.listMeals().find((meal) => meal.name === name);
  if (existing) repo.deleteMeal(existing.id);
  return repo.createMeal({ name, items });
}

repo.updateSettings({
  calorieGoal: 2200,
  proteinGoal: 165,
  carbsGoal: 220,
  fatGoal: 70,
  weightUnit: 'lb'
});

const oats = upsertFood({ name: 'Oatmeal', brand: 'Kitchen', servingQty: 1, servingUnit: 'bowl', calories: 300, protein: 12, carbs: 48, fat: 6 });
const yogurt = upsertFood({ name: 'Greek Yogurt', brand: 'Fage', servingQty: 170, servingUnit: 'g', calories: 100, protein: 18, carbs: 6, fat: 0 });
const berries = upsertFood({ name: 'Blueberries', brand: null, servingQty: 1, servingUnit: 'cup', calories: 84, protein: 1, carbs: 21, fat: 0.5 });
const chicken = upsertFood({ name: 'Chicken Breast', brand: null, servingQty: 4, servingUnit: 'oz', calories: 185, protein: 35, carbs: 0, fat: 4 });
const rice = upsertFood({ name: 'Jasmine Rice', brand: null, servingQty: 1, servingUnit: 'cup', calories: 205, protein: 4, carbs: 45, fat: 0.4 });
const broccoli = upsertFood({ name: 'Broccoli', brand: null, servingQty: 1, servingUnit: 'cup', calories: 55, protein: 4, carbs: 11, fat: 0.6 });
const salmon = upsertFood({ name: 'Salmon Filet', brand: null, servingQty: 5, servingUnit: 'oz', calories: 295, protein: 34, carbs: 0, fat: 17 });
const potato = upsertFood({ name: 'Sweet Potato', brand: null, servingQty: 1, servingUnit: 'medium', calories: 112, protein: 2, carbs: 26, fat: 0 });
const eggs = upsertFood({ name: 'Eggs', brand: null, servingQty: 2, servingUnit: 'eggs', calories: 140, protein: 12, carbs: 1, fat: 10 });
const shake = upsertFood({ name: 'Protein Shake', brand: 'Post-workout', servingQty: 1, servingUnit: 'shake', calories: 180, protein: 30, carbs: 8, fat: 3 });

const breakfast = recreateMeal('Usual Breakfast', [
  { foodId: oats.id, quantity: 1 },
  { foodId: yogurt.id, quantity: 1 },
  { foodId: berries.id, quantity: 0.5 }
]);

const lunch = recreateMeal('Chicken Rice Bowl', [
  { foodId: chicken.id, quantity: 1.5 },
  { foodId: rice.id, quantity: 1 },
  { foodId: broccoli.id, quantity: 1 }
]);

const dinner = recreateMeal('Salmon Dinner', [
  { foodId: salmon.id, quantity: 1 },
  { foodId: potato.id, quantity: 1 },
  { foodId: broccoli.id, quantity: 1 }
]);

const eggSnack = recreateMeal('Egg Snack', [
  { foodId: eggs.id, quantity: 1 },
  { foodId: shake.id, quantity: 1 }
]);

for (let i = 20; i >= 0; i -= 2) {
  const trend = 203.8 - (20 - i) * 0.11;
  const wobble = [0, -0.4, 0.2, -0.1, 0.3][i % 5];
  safeWeightLog(isoDate(i), Number((trend + wobble).toFixed(1)), i === 0 ? 'Seeded current weight' : null);
}

for (let i = 13; i >= 0; i--) {
  const date = isoDate(i);
  const existingLogs = repo.listFoodLogs(date);
  existingLogs.forEach((log) => repo.deleteFoodLog(log.id));

  repo.logFood({ date, mealId: breakfast.id, quantity: 1 });
  repo.logFood({ date, mealId: lunch.id, quantity: i % 3 === 0 ? 1.1 : 1 });
  repo.logFood({ date, mealId: dinner.id, quantity: i % 4 === 0 ? 0.85 : 1 });
  if (i % 2 === 0) repo.logFood({ date, mealId: eggSnack.id, quantity: 1 });
  if (i % 5 === 0) repo.logFood({ date, foodId: yogurt.id, quantity: 1 });
}

db.close();
console.log('Seeded health tracker database with foods, meals, weight logs, and food logs.');
