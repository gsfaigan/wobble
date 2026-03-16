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
    const { name, score, sessionId } = req.body ?? {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Missing game session' });
    }

    const rawIssuedAt = await redis.get<number>(`wobble:session:${sessionId}`);
    if (rawIssuedAt === null) {
      return res.status(400).json({ error: 'Invalid or expired game session' });
    }

    // One-time use: delete immediately
    await redis.del(`wobble:session:${sessionId}`);

    const elapsedSeconds = (Date.now() - Number(rawIssuedAt)) / 1000;
    // Max blocks = elapsedSeconds / 0.6s (DROP_COOLDOWN_MS), 10pts each, 1.5x buffer
    const maxPlausibleScore = Math.floor(elapsedSeconds / 0.6) * 10 * 1.5;

    const rawScore = Number(score);
    if (!isFinite(rawScore) || rawScore < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    if (rawScore > maxPlausibleScore) {
      return res.status(400).json({ error: 'Score not plausible for session duration' });
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const cleanName = name.trim().replace(/[^\x20-\x7E]/g, '').slice(0, MAX_NAME_LEN);
    if (cleanName.length === 0) {
      return res.status(400).json({ error: 'Invalid name' });
    }
    const normalize = (s: string) => s
      .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
      .replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's')
      .replace(/7/g, 't').replace(/@/g, 'a');

    if (filter.isProfane(cleanName) || filter.isProfane(normalize(cleanName))) {
      return res.status(400).json({ error: 'Inappropriate name — please choose another' });
    }

    const cleanScore = Math.min(Math.floor(rawScore), MAX_SCORE);

    // gt: true — only update if the new score is higher than the existing one
    await redis.zadd(KEY, { gt: true }, { score: cleanScore, member: cleanName });

    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
