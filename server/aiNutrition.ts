import { anthropic } from '@ai-sdk/anthropic';
import { generateText, Output, type ImagePart, type LanguageModel, type TextPart } from 'ai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { AiNutritionEstimate, AiNutritionEstimateRequest } from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptPath = path.resolve(__dirname, '..', 'prompts', 'nutrition-estimator.txt');
const defaultModel = 'claude-sonnet-4-5';

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

const nutritionEstimateOutputSchema = z.object({
  target: z.enum(['food', 'log']),
  label: z.string().trim().min(1),
  servingQty: z.number().positive(),
  servingUnit: z.string().trim().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  confidence: z.enum(['low', 'medium', 'high']),
  note: z.string().trim().min(1).max(400)
});

type NutritionEstimateOutput = z.infer<typeof nutritionEstimateOutputSchema>;

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeEstimate(estimate: NutritionEstimateOutput): AiNutritionEstimate {
  return {
    ...estimate,
    servingQty: round(estimate.servingQty),
    calories: round(estimate.calories),
    protein: round(estimate.protein),
    carbs: round(estimate.carbs),
    fat: round(estimate.fat)
  };
}

function parseImageDataUrl(dataUrl: string): Pick<ImagePart, 'image' | 'mediaType'> {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new Error('Invalid image data');

  return {
    mediaType: match[1] === 'image/jpg' ? 'image/jpeg' : match[1],
    image: match[2].replace(/\s/g, '')
  };
}

export type NutritionEstimator = (input: AiNutritionEstimateRequest) => Promise<AiNutritionEstimate>;

export function createNutritionEstimator(model: LanguageModel = anthropic(process.env.AI_NUTRITION_MODEL || defaultModel)): NutritionEstimator {
  return async (input) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new AiConfigurationError('ANTHROPIC_API_KEY is required to estimate nutrition.');
    }

    const system = await fs.readFile(promptPath, 'utf8');
    const content: Array<TextPart | ImagePart> = [{
      type: 'text',
      text: [
        `Target: ${input.target}`,
        input.text ? `User description: ${input.text}` : 'User description: not provided',
        'Return nutrition for the visible/described portion only.'
      ].join('\n')
    }];

    if (input.image) {
      content.push({ type: 'image', ...parseImageDataUrl(input.image.dataUrl) });
    }

    const result = await generateText({
      model,
      system,
      messages: [{ role: 'user', content }],
      output: Output.object({
        name: 'NutritionEstimate',
        description: 'Estimated calories and macronutrients for a food or one-off meal log.',
        schema: nutritionEstimateOutputSchema
      }),
      temperature: 0.1,
      maxOutputTokens: 700
    });

    return normalizeEstimate(result.output);
  };
}
