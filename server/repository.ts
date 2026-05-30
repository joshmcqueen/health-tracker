import type { AppDatabase } from './db';
import type { ChartPoint, DailySummary, DirectFoodLogInput, Food, FoodLog, MacroTotals, Meal, MealItem, Settings, WeightLog } from '../shared/types';

type DbSettings = {
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  weight_unit: 'lb' | 'kg';
};

type DbFood = {
  id: number;
  name: string;
  serving_qty: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
};

type DbFoodLog = {
  id: number;
  date: string;
  food_id: number | null;
  meal_id: number | null;
  label: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
};

const emptyTotals = (): MacroTotals => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });
const round = (value: number) => Math.round(value * 10) / 10;

function mapSettings(row: DbSettings): Settings {
  return {
    calorieGoal: row.calorie_goal,
    proteinGoal: row.protein_goal,
    carbsGoal: row.carbs_goal,
    fatGoal: row.fat_goal,
    weightUnit: row.weight_unit
  };
}

function mapFood(row: DbFood): Food {
  return {
    id: row.id,
    name: row.name,
    servingQty: row.serving_qty,
    servingUnit: row.serving_unit,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    createdAt: row.created_at
  };
}

function mapFoodLog(row: DbFoodLog): FoodLog {
  return {
    id: row.id,
    date: row.date,
    foodId: row.food_id,
    mealId: row.meal_id,
    label: row.label,
    quantity: row.quantity,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    createdAt: row.created_at
  };
}

function mapWeightLog(row: { id: number; date: string; weight: number; note: string | null; created_at: string }): WeightLog {
  return {
    id: row.id,
    date: row.date,
    weight: row.weight,
    note: row.note,
    createdAt: row.created_at
  };
}

function addTotals(target: MacroTotals, source: MacroTotals, quantity = 1) {
  target.calories += source.calories * quantity;
  target.protein += source.protein * quantity;
  target.carbs += source.carbs * quantity;
  target.fat += source.fat * quantity;
}

function normalizeTotals(totals: MacroTotals): MacroTotals {
  return {
    calories: round(totals.calories),
    protein: round(totals.protein),
    carbs: round(totals.carbs),
    fat: round(totals.fat)
  };
}

export function createRepository(db: AppDatabase) {
  const getFood = (id: number) => {
    const row = db.prepare('SELECT * FROM foods WHERE id = ?').get(id) as DbFood | undefined;
    return row ? mapFood(row) : null;
  };

  const getMeal = (id: number): Meal | null => {
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(id) as { id: number; name: string; created_at: string } | undefined;
    if (!meal) return null;

    const rows = db.prepare(`
      SELECT mi.id, mi.meal_id, mi.food_id, mi.quantity, f.*
      FROM meal_items mi
      JOIN foods f ON f.id = mi.food_id
      WHERE mi.meal_id = ?
      ORDER BY mi.id
    `).all(id) as Array<{ id: number; meal_id: number; food_id: number; quantity: number } & DbFood>;

    const totals = emptyTotals();
    const items: MealItem[] = rows.map((row) => {
      const food = mapFood(row);
      addTotals(totals, food, row.quantity);
      return {
        id: row.id,
        mealId: row.meal_id,
        foodId: row.food_id,
        quantity: row.quantity,
        food
      };
    });

    return {
      id: meal.id,
      name: meal.name,
      createdAt: meal.created_at,
      items,
      totals: normalizeTotals(totals)
    };
  };

  const listMeals = () => {
    const rows = db.prepare('SELECT id FROM meals ORDER BY name').all() as Array<{ id: number }>;
    return rows.map((row) => getMeal(row.id)).filter(Boolean) as Meal[];
  };

  const createMeal = db.transaction((input: { name: string; items: Array<{ foodId: number; quantity: number }> }) => {
    const result = db.prepare('INSERT INTO meals (name) VALUES (?)').run(input.name);
    const mealId = Number(result.lastInsertRowid);
    const insertItem = db.prepare('INSERT INTO meal_items (meal_id, food_id, quantity) VALUES (?, ?, ?)');
    input.items.forEach((item) => insertItem.run(mealId, item.foodId, item.quantity));
    return getMeal(mealId)!;
  });

  const updateMeal = db.transaction((id: number, input: { name: string; items: Array<{ foodId: number; quantity: number }> }) => {
    db.prepare('UPDATE meals SET name = ? WHERE id = ?').run(input.name, id);
    db.prepare('DELETE FROM meal_items WHERE meal_id = ?').run(id);
    const insertItem = db.prepare('INSERT INTO meal_items (meal_id, food_id, quantity) VALUES (?, ?, ?)');
    input.items.forEach((item) => insertItem.run(id, item.foodId, item.quantity));
    return getMeal(id);
  });

  const logFood = (input: { date: string; foodId?: number; mealId?: number; quantity: number }) => {
    let label = '';
    const totals = emptyTotals();

    if (input.foodId) {
      const food = getFood(input.foodId);
      if (!food) return null;
      label = food.name;
      addTotals(totals, food, input.quantity);
    } else if (input.mealId) {
      const meal = getMeal(input.mealId);
      if (!meal) return null;
      label = meal.name;
      addTotals(totals, meal.totals, input.quantity);
    }

    const normalized = normalizeTotals(totals);
    const result = db.prepare(`
      INSERT INTO food_logs (date, food_id, meal_id, label, quantity, calories, protein, carbs, fat)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(input.date, input.foodId ?? null, input.mealId ?? null, label, input.quantity, normalized.calories, normalized.protein, normalized.carbs, normalized.fat);

    const row = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(result.lastInsertRowid) as DbFoodLog;
    return mapFoodLog(row);
  };

  const logDirectFood = (input: DirectFoodLogInput) => {
    const normalized = normalizeTotals(input);
    const result = db.prepare(`
      INSERT INTO food_logs (date, food_id, meal_id, label, quantity, calories, protein, carbs, fat)
      VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?)
    `).run(input.date, input.label, input.quantity, normalized.calories, normalized.protein, normalized.carbs, normalized.fat);

    const row = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(result.lastInsertRowid) as DbFoodLog;
    return mapFoodLog(row);
  };

  const getDailySummary = (date: string): DailySummary => {
    const logs = (db.prepare('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC, id DESC').all(date) as DbFoodLog[]).map(mapFoodLog);
    const totals = logs.reduce((acc, log) => {
      addTotals(acc, log);
      return acc;
    }, emptyTotals());
    return {
      date,
      settings: mapSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get() as DbSettings),
      totals: normalizeTotals(totals),
      logs
    };
  };

  const getChartPoints = (from: string, to: string): ChartPoint[] => {
    const foodRows = db.prepare(`
      SELECT date, SUM(calories) calories, SUM(protein) protein, SUM(carbs) carbs, SUM(fat) fat
      FROM food_logs
      WHERE date BETWEEN ? AND ?
      GROUP BY date
    `).all(from, to) as Array<{ date: string } & MacroTotals>;

    const weightRows = db.prepare('SELECT date, weight FROM weight_logs WHERE date BETWEEN ? AND ?').all(from, to) as Array<{ date: string; weight: number }>;
    const byDate = new Map<string, ChartPoint>();

    foodRows.forEach((row) => byDate.set(row.date, {
      date: row.date,
      weight: null,
      calories: round(row.calories || 0),
      protein: round(row.protein || 0),
      carbs: round(row.carbs || 0),
      fat: round(row.fat || 0)
    }));

    weightRows.forEach((row) => {
      const existing = byDate.get(row.date) ?? { date: row.date, weight: null, calories: 0, protein: 0, carbs: 0, fat: 0 };
      existing.weight = row.weight;
      byDate.set(row.date, existing);
    });

    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  };

  return {
    getSettings: () => mapSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get() as DbSettings),
    updateSettings: (settings: Settings) => {
      db.prepare(`
        UPDATE settings
        SET calorie_goal = ?, protein_goal = ?, carbs_goal = ?, fat_goal = ?, weight_unit = ?
        WHERE id = 1
      `).run(settings.calorieGoal, settings.proteinGoal, settings.carbsGoal, settings.fatGoal, settings.weightUnit);
      return mapSettings(db.prepare('SELECT * FROM settings WHERE id = 1').get() as DbSettings);
    },
    listWeightLogs: () => (db.prepare('SELECT * FROM weight_logs ORDER BY date DESC').all() as Array<{ id: number; date: string; weight: number; note: string | null; created_at: string }>).map(mapWeightLog),
    createWeightLog: (input: { date: string; weight: number; note: string | null }) => {
      const result = db.prepare('INSERT INTO weight_logs (date, weight, note) VALUES (?, ?, ?)').run(input.date, input.weight, input.note);
      return mapWeightLog(db.prepare('SELECT * FROM weight_logs WHERE id = ?').get(result.lastInsertRowid) as { id: number; date: string; weight: number; note: string | null; created_at: string });
    },
    updateWeightLog: (id: number, input: { date: string; weight: number; note: string | null }) => {
      db.prepare('UPDATE weight_logs SET date = ?, weight = ?, note = ? WHERE id = ?').run(input.date, input.weight, input.note, id);
      const row = db.prepare('SELECT * FROM weight_logs WHERE id = ?').get(id) as { id: number; date: string; weight: number; note: string | null; created_at: string } | undefined;
      return row ? mapWeightLog(row) : undefined;
    },
    deleteWeightLog: (id: number) => db.prepare('DELETE FROM weight_logs WHERE id = ?').run(id).changes,
    listFoods: () => (db.prepare('SELECT * FROM foods ORDER BY name').all() as DbFood[]).map(mapFood),
    createFood: (input: Omit<Food, 'id' | 'createdAt'>) => {
      const result = db.prepare(`
        INSERT INTO foods (name, serving_qty, serving_unit, calories, protein, carbs, fat)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(input.name, input.servingQty, input.servingUnit, input.calories, input.protein, input.carbs, input.fat);
      return getFood(Number(result.lastInsertRowid))!;
    },
    updateFood: (id: number, input: Omit<Food, 'id' | 'createdAt'>) => {
      db.prepare(`
        UPDATE foods
        SET name = ?, serving_qty = ?, serving_unit = ?, calories = ?, protein = ?, carbs = ?, fat = ?
        WHERE id = ?
      `).run(input.name, input.servingQty, input.servingUnit, input.calories, input.protein, input.carbs, input.fat, id);
      return getFood(id);
    },
    deleteFood: (id: number) => db.prepare('DELETE FROM foods WHERE id = ?').run(id).changes,
    listMeals,
    getMeal,
    createMeal,
    updateMeal,
    deleteMeal: (id: number) => db.prepare('DELETE FROM meals WHERE id = ?').run(id).changes,
    logFood,
    listFoodLogs: (date?: string) => {
      const rows = date
        ? db.prepare('SELECT * FROM food_logs WHERE date = ? ORDER BY created_at DESC, id DESC').all(date)
        : db.prepare('SELECT * FROM food_logs ORDER BY date DESC, created_at DESC, id DESC LIMIT 200').all();
      return (rows as DbFoodLog[]).map(mapFoodLog);
    },
    updateFoodLog: (id: number, input: { date: string; quantity: number }) => {
      const current = db.prepare('SELECT * FROM food_logs WHERE id = ?').get(id) as DbFoodLog | undefined;
      if (!current) return null;
      const next = logFood({ date: input.date, foodId: current.food_id ?? undefined, mealId: current.meal_id ?? undefined, quantity: input.quantity });
      if (!next) return null;
      db.prepare('UPDATE food_logs SET date = ?, label = ?, quantity = ?, calories = ?, protein = ?, carbs = ?, fat = ? WHERE id = ?')
        .run(next.date, next.label, next.quantity, next.calories, next.protein, next.carbs, next.fat, id);
      db.prepare('DELETE FROM food_logs WHERE id = ?').run(next.id);
      return db.prepare('SELECT * FROM food_logs WHERE id = ?').get(id) ? mapFoodLog(db.prepare('SELECT * FROM food_logs WHERE id = ?').get(id) as DbFoodLog) : null;
    },
    logDirectFood,
    deleteFoodLog: (id: number) => db.prepare('DELETE FROM food_logs WHERE id = ?').run(id).changes,
    getDailySummary,
    getChartPoints
  };
}
