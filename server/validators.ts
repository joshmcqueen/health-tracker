import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveNumber = z.coerce.number().positive();
const nonNegativeNumber = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable().transform((value) => value || null);

export const settingsSchema = z.object({
  calorieGoal: positiveNumber,
  proteinGoal: nonNegativeNumber,
  carbsGoal: nonNegativeNumber,
  fatGoal: nonNegativeNumber,
  weightUnit: z.enum(['lb', 'kg']).default('lb')
});

export const weightLogSchema = z.object({
  date: dateString,
  weight: positiveNumber,
  note: optionalText
});

export const foodSchema = z.object({
  name: z.string().trim().min(1),
  servingQty: positiveNumber,
  servingUnit: z.string().trim().min(1),
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber
});

export const mealSchema = z.object({
  name: z.string().trim().min(1),
  items: z.array(z.object({
    foodId: z.coerce.number().int().positive(),
    quantity: positiveNumber
  })).min(1)
});

export const foodLogSchema = z.object({
  date: dateString,
  foodId: z.coerce.number().int().positive().optional(),
  mealId: z.coerce.number().int().positive().optional(),
  quantity: positiveNumber.default(1)
}).refine((value) => Boolean(value.foodId) !== Boolean(value.mealId), {
  message: 'Provide exactly one of foodId or mealId'
});

export const foodLogUpdateSchema = z.object({
  date: dateString,
  quantity: positiveNumber
});

export const rangeSchema = z.object({
  from: dateString,
  to: dateString
});
