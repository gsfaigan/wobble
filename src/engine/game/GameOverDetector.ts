import { Platform } from './Platform';
import { PlacedBlock } from './BlockFactory';
import { TILT_LIMIT } from './constants';

export class GameOverDetector {
  check(platform: Platform, placedBlocks: PlacedBlock[]): string | null {
    if (platform.getTiltAngleAbs() > TILT_LIMIT) {
      return 'tilt';
    }
    return null;
  }
}
