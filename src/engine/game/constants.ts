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
  I: 0x00f5ff,
  O: 0xffe600,
  T: 0xa020f0,
  L: 0xff8c00,
  J: 0x0050ff,
  S: 0x00c020,
  Z: 0xff2020,
};

export const SHAPE_KEYS = Object.keys(SHAPES);
