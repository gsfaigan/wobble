import { GameManager } from './engine/game/GameManager';
import { inject } from '@vercel/analytics';

inject();

const game = new GameManager();
game.start();
