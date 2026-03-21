# Wobble

A browser-based physics game where you stack Tetris-shaped blocks on a rocking platform. Stack as high as you can without tipping it over.

## How to Play

- Drag and drop blocks onto the platform
- You can rotate them as well
- The platform tilts under the weight so balance your placements
- Game ends when a block falls off

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
