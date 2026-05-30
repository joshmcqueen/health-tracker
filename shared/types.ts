export type Settings = {
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  weightUnit: 'lb' | 'kg';
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type WeightLog = {
  id: number;
  date: string;
  weight: number;
  createdAt: string;
};

export type Food = {
  id: number;
  name: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
};

export type MealItem = {
  id: number;
  mealId: number;
  foodId: number;
  quantity: number;
  food: Food;
};

export type Meal = {
  id: number;
  name: string;
  createdAt: string;
  items: MealItem[];
  totals: MacroTotals;
};

export type FoodLog = {
  id: number;
  date: string;
  foodId: number | null;
  mealId: number | null;
  label: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
};

export type DirectFoodLogInput = {
  date: string;
  label: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type AiNutritionEstimateRequest = {
  target: 'food' | 'log';
  text?: string;
  image?: {
    dataUrl: string;
  };
};

export type AiNutritionEstimate = {
  target: 'food' | 'log';
  label: string;
  servingQty: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: 'low' | 'medium' | 'high';
  note: string;
};

export type DailySummary = {
  date: string;
  settings: Settings;
  totals: MacroTotals;
  logs: FoodLog[];
};

export type ChartPoint = {
  date: string;
  weight: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
