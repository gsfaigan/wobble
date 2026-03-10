import { Platform } from './Platform';
import { PlacedBlock } from './BlockFactory';
import { TILT_LIMIT, BLOCK_SIZE } from './constants';

// A block center at BLOCK_SIZE/2 means it's resting on the ground (y=0)
const GROUND_THRESHOLD = BLOCK_SIZE * 0.8;

export class GameOverDetector {
  check(platform: Platform, placedBlocks: PlacedBlock[]): string | null {
    // Check tilt
    if (platform.getTiltAngleAbs() > TILT_LIMIT) {
      return 'tilt';
    }

    // Check if any block has touched the ground
    for (const block of placedBlocks) {
      if (block.body.position.y < GROUND_THRESHOLD) {
        return 'grounded';
      }
    }

    return null;
  }
}
