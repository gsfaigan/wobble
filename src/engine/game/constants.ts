export const BLOCK_SIZE = 1;
export const TILT_LIMIT = Math.PI / 4; // 45°
export const BLOCK_MASS = 1;
export const PLATFORM_WIDTH = 20;
export const PLATFORM_DEPTH = 0.5;
export const PLATFORM_HEIGHT = 0.9;
export const ROCKER_RADIUS = 3.6;

// Collision filter groups
export const COL_GROUND = 1;
export const COL_BLOCK = 2;
export const COL_PLATFORM = 4;

// Height from which blocks are dropped / ghost hovers
export const DROP_HEIGHT = 7;

export const SHAPES: Record<string, [number, number, number][]> = {
  I: [[0,0,0],[1,0,0],[2,0,0],[3,0,0]],
  O: [[0,0,0],[1,0,0],[0,1,0],[1,1,0]],
  T: [[0,0,0],[1,0,0],[2,0,0],[1,1,0]],
  L: [[0,0,0],[0,1,0],[0,2,0],[1,2,0]],
  J: [[1,0,0],[1,1,0],[1,2,0],[0,2,0]],
  S: [[1,0,0],[2,0,0],[0,1,0],[1,1,0]],
  Z: [[0,0,0],[1,0,0],[1,1,0],[2,1,0]],
};

export const COLORS: Record<string, number> = {
  I: 0x0d7a8a,  // dark teal
  O: 0x8a7010,  // dark amber
  T: 0x6010a0,  // deep purple
  L: 0x8a4a00,  // burnt orange
  J: 0x1030a0,  // steel blue
  S: 0x0a7020,  // forest green
  Z: 0xa01010,  // dark red
};

export const SHAPE_KEYS = Object.keys(SHAPES);
