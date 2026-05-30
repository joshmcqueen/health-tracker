import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveNumber = z.coerce.number().positive();
const nonNegativeNumber = z.coerce.number().min(0);
const optionalText = z.string().trim().optional().nullable().transform((value) => value || null);
const imageDataUrl = z.string()
  .max(6_500_000)
  .regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\s]+$/);

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

export const directFoodLogSchema = z.object({
  date: dateString,
  label: z.string().trim().min(1),
  quantity: positiveNumber.default(1),
  calories: nonNegativeNumber,
  protein: nonNegativeNumber,
  carbs: nonNegativeNumber,
  fat: nonNegativeNumber
});

export const foodLogUpdateSchema = z.object({
  date: dateString,
  quantity: positiveNumber
});

export const rangeSchema = z.object({
  from: dateString,
  to: dateString
});

export const aiNutritionEstimateSchema = z.object({
  target: z.enum(['food', 'log']),
  text: z.string().trim().max(2000).optional(),
  image: z.object({
    dataUrl: imageDataUrl
  }).optional()
}).refine((value) => Boolean(value.text) || Boolean(value.image), {
  message: 'Provide text, an image, or both'
});
