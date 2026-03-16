import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { nanoid } from 'nanoid';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    const sessionId = nanoid(32);
    await redis.set(`wobble:session:${sessionId}`, Date.now(), { ex: 14400 }); // 4hr TTL
    return res.json({ sessionId });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
