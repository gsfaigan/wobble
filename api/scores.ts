import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Filter } from 'bad-words';

const filter = new Filter();

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const KEY = 'wobble:scores';
const MAX_SCORE = 10000;
const MAX_NAME_LEN = 20;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    const raw = await redis.zrange<string[]>(KEY, 0, 9, { rev: true, withScores: true });
    const entries: { name: string; score: number; rank: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      entries.push({ name: raw[i], score: Number(raw[i + 1]), rank: entries.length + 1 });
    }
    return res.json(entries);
  }

  if (req.method === 'POST') {
    const { name, score } = req.body ?? {};

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const cleanName = name.trim().replace(/[^\x20-\x7E]/g, '').slice(0, MAX_NAME_LEN);
    if (cleanName.length === 0) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    if (filter.isProfane(cleanName)) {
      return res.status(400).json({ error: 'Inappropriate name — please choose another' });
    }

    const rawScore = Number(score);
    if (!isFinite(rawScore) || rawScore < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const cleanScore = Math.min(Math.floor(rawScore), MAX_SCORE);

    // gt: true — only update if the new score is higher than the existing one
    await redis.zadd(KEY, { gt: true }, { score: cleanScore, member: cleanName });

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
