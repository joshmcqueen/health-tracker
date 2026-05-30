import type { AiNutritionEstimate, AiNutritionEstimateRequest, ChartPoint, DailySummary, DirectFoodLogInput, Food, FoodLog, Meal, Settings, WeightLog } from '../shared/types';

type RequestOptions = {
  method?: string;
  body?: unknown;
};

type WeightLogInput = Pick<WeightLog, 'date' | 'weight'>;

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? 'Request failed');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  settings: () => request<Settings>('/api/settings'),
  updateSettings: (body: Settings) => request<Settings>('/api/settings', { method: 'PUT', body }),
  weightLogs: () => request<WeightLog[]>('/api/weight-logs'),
  createWeightLog: (body: WeightLogInput) => request<WeightLog>('/api/weight-logs', { method: 'POST', body }),
  updateWeightLog: (id: number, body: WeightLogInput) => request<WeightLog>(`/api/weight-logs/${id}`, { method: 'PUT', body }),
  deleteWeightLog: (id: number) => request<void>(`/api/weight-logs/${id}`, { method: 'DELETE' }),
  foods: () => request<Food[]>('/api/foods'),
  createFood: (body: Omit<Food, 'id' | 'createdAt'>) => request<Food>('/api/foods', { method: 'POST', body }),
  updateFood: (id: number, body: Omit<Food, 'id' | 'createdAt'>) => request<Food>(`/api/foods/${id}`, { method: 'PUT', body }),
  deleteFood: (id: number) => request<void>(`/api/foods/${id}`, { method: 'DELETE' }),
  meals: () => request<Meal[]>('/api/meals'),
  createMeal: (body: { name: string; items: Array<{ foodId: number; quantity: number }> }) => request<Meal>('/api/meals', { method: 'POST', body }),
  updateMeal: (id: number, body: { name: string; items: Array<{ foodId: number; quantity: number }> }) => request<Meal>(`/api/meals/${id}`, { method: 'PUT', body }),
  deleteMeal: (id: number) => request<void>(`/api/meals/${id}`, { method: 'DELETE' }),
  dailySummary: (date: string) => request<DailySummary>(`/api/summary/daily?date=${date}`),
  foodLogs: (date: string) => request<FoodLog[]>(`/api/food-logs?date=${date}`),
  logFood: (body: { date: string; foodId?: number; mealId?: number; quantity: number }) => request<FoodLog>('/api/food-logs', { method: 'POST', body }),
  logDirectFood: (body: DirectFoodLogInput) => request<FoodLog>('/api/food-logs/direct', { method: 'POST', body }),
  deleteFoodLog: (id: number) => request<void>(`/api/food-logs/${id}`, { method: 'DELETE' }),
  charts: (from: string, to: string) => request<ChartPoint[]>(`/api/charts?from=${from}&to=${to}`),
  estimateNutrition: (body: AiNutritionEstimateRequest) => request<AiNutritionEstimate>('/api/ai/nutrition-estimate', { method: 'POST', body })
};
