import cors from 'cors';
import express from 'express';
import type { AppDatabase } from './db';
import { AiConfigurationError, createNutritionEstimator, type NutritionEstimator } from './aiNutrition';
import { createRepository } from './repository';
import { aiNutritionEstimateSchema, directFoodLogSchema, foodLogSchema, foodLogUpdateSchema, foodSchema, mealSchema, rangeSchema, settingsSchema, weightLogSchema } from './validators';

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function handleError(res: express.Response, error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error) {
    return res.status(400).json({ error: 'Validation failed', details: error });
  }
  if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'That date or name already exists.' });
  }
  console.error(error);
  return res.status(500).json({ error: 'Something went wrong.' });
}

type AppOptions = {
  estimateNutrition?: NutritionEstimator;
};

export function createApp(db: AppDatabase, options: AppOptions = {}) {
  const app = express();
  const repo = createRepository(db);
  const estimateNutrition = options.estimateNutrition ?? createNutritionEstimator();

  app.use(cors());
  app.use(express.json({ limit: '7mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/settings', (_req, res) => res.json(repo.getSettings()));
  app.put('/api/settings', (req, res) => {
    try {
      res.json(repo.updateSettings(settingsSchema.parse(req.body)));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/weight-logs', (_req, res) => res.json(repo.listWeightLogs()));
  app.post('/api/weight-logs', (req, res) => {
    try {
      res.status(201).json(repo.createWeightLog(weightLogSchema.parse(req.body)));
    } catch (error) {
      handleError(res, error);
    }
  });
  app.put('/api/weight-logs/:id', (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const updated = repo.updateWeightLog(id, weightLogSchema.parse(req.body));
      return updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.delete('/api/weight-logs/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    return repo.deleteWeightLog(id) ? res.status(204).end() : res.status(404).json({ error: 'Not found' });
  });

  app.get('/api/foods', (_req, res) => res.json(repo.listFoods()));
  app.post('/api/foods', (req, res) => {
    try {
      res.status(201).json(repo.createFood(foodSchema.parse(req.body)));
    } catch (error) {
      handleError(res, error);
    }
  });
  app.put('/api/foods/:id', (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const updated = repo.updateFood(id, foodSchema.parse(req.body));
      return updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.delete('/api/foods/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    return repo.deleteFood(id) ? res.status(204).end() : res.status(404).json({ error: 'Not found' });
  });

  app.get('/api/meals', (_req, res) => res.json(repo.listMeals()));
  app.post('/api/meals', (req, res) => {
    try {
      res.status(201).json(repo.createMeal(mealSchema.parse(req.body)));
    } catch (error) {
      handleError(res, error);
    }
  });
  app.put('/api/meals/:id', (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const updated = repo.updateMeal(id, mealSchema.parse(req.body));
      return updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.delete('/api/meals/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    return repo.deleteMeal(id) ? res.status(204).end() : res.status(404).json({ error: 'Not found' });
  });

  app.get('/api/food-logs', (req, res) => res.json(repo.listFoodLogs(typeof req.query.date === 'string' ? req.query.date : undefined)));
  app.post('/api/food-logs', (req, res) => {
    try {
      const logged = repo.logFood(foodLogSchema.parse(req.body));
      return logged ? res.status(201).json(logged) : res.status(404).json({ error: 'Food or meal not found' });
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.post('/api/food-logs/direct', (req, res) => {
    try {
      res.status(201).json(repo.logDirectFood(directFoodLogSchema.parse(req.body)));
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.put('/api/food-logs/:id', (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const body = foodLogUpdateSchema.parse(req.body);
      const updated = repo.updateFoodLog(id, body);
      return updated ? res.json(updated) : res.status(404).json({ error: 'Not found' });
    } catch (error) {
      return handleError(res, error);
    }
  });
  app.delete('/api/food-logs/:id', (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    return repo.deleteFoodLog(id) ? res.status(204).end() : res.status(404).json({ error: 'Not found' });
  });

  app.get('/api/summary/daily', (req, res) => {
    if (typeof req.query.date !== 'string') return res.status(400).json({ error: 'date is required' });
    try {
      res.json(repo.getDailySummary(req.query.date));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.get('/api/charts', (req, res) => {
    try {
      const range = rangeSchema.parse(req.query);
      res.json(repo.getChartPoints(range.from, range.to));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/ai/nutrition-estimate', async (req, res) => {
    try {
      res.json(await estimateNutrition(aiNutritionEstimateSchema.parse(req.body)));
    } catch (error) {
      if (error instanceof AiConfigurationError) {
        return res.status(503).json({ error: error.message });
      }
      return handleError(res, error);
    }
  });

  return app;
}
