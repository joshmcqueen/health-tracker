import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app';
import { createDatabase } from './db';

const port = Number(process.env.PORT || 3000);
const db = createDatabase();
const app = createApp(db);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'client');

app.use(express.static(publicDir));
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Health tracker API listening on http://localhost:${port}`);
});
