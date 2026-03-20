# Wobble

A browser-based physics game where you stack Tetris-shaped blocks on a rocking platform. Stack as high as you can without tipping it over.

## How to Play

- Drag and drop blocks onto the platform
- The platform tilts under the weight — balance your placements
- Game ends when the platform tilts past 45° or a block falls off

## Tech Stack

| | |
|---|---|
| **Rendering** | [Three.js](https://threejs.org/) v0.183 |
| **Physics** | [cannon-es](https://github.com/pmndrs/cannon-es) v0.20 |
| **Language** | TypeScript 5.4 |
| **Bundler** | Vite 5.2 |
| **Leaderboard** | Upstash Redis |
| **Hosting** | Vercel |

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
