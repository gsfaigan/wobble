import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { SceneManager } from '../render/SceneManager';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Platform } from './Platform';
import { BlockFactory, PlacedBlock } from './BlockFactory';
import { GhostBlock } from './GhostBlock';
import { InputSystem } from './InputSystem';
import { GameOverDetector } from './GameOverDetector';
import { UIManager } from '../../ui/UIManager';
import { AudioManager } from './AudioManager';
import { SHAPE_KEYS, PLATFORM_WIDTH, PLATFORM_DEPTH, DROP_HEIGHT, COL_BLOCK } from './constants';

export class GameManager {
  private scene: SceneManager;
  private physics!: PhysicsWorld;
  private platform!: Platform;
  private blockFactory!: BlockFactory;
  private ghostBlock!: GhostBlock;
  private inputSystem!: InputSystem;
  private gameOverDetector: GameOverDetector;
  private ui: UIManager;
  private audio: AudioManager = new AudioManager('/music.mp3');

  private placedBlocks: PlacedBlock[] = [];
  private score: number = 0;
  private turns: number = 0;
  private gameActive: boolean = false;
  private _firstRun: boolean = true;
  private currentShapeKey: string = 'I';
  private dropHeight: number = DROP_HEIGHT;

  private lastTime: number = 0;
  private lastDropTime: number = 0;
  private readonly DROP_COOLDOWN_MS = 600;
  private _mousePos: THREE.Vector3 = new THREE.Vector3(0, DROP_HEIGHT, 0);
  private _rafId: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.scene = new SceneManager(canvas);
    this.gameOverDetector = new GameOverDetector();
    this.ui = new UIManager();

    this.ui.onStart(() => this.beginPlay());
    this.ui.onRestart(() => this.start());
    this.ui.onPause(
      () => { this.inputSystem.setActive(false); },
      () => { if (this.gameActive) this.inputSystem.setActive(true); },
      (v) => this.audio.setVolume(v),
      (v) => { this.audio.sfxVolume = v; }
    );

    window.addEventListener('resize', () => this.scene.onResize());

    this._init(); // sets up scene, physics, loop — paused until beginPlay()
  }

  private _init(): void {
    this.inputSystem = new InputSystem(
      this.scene.camera,
      this.scene.scene,
      (pos) => this.onMouseMove(pos),
      () => this.onDrop(),
      () => this.onRotate()
    );

    this.inputSystem.onTouchChange = (active: boolean) => {
      if (this.gameActive) this.ghostBlock.setVisible(active);
    };

  }

  // Called by PLAY button — unpauses without rebuilding
  private beginPlay(): void {
    this.audio.play();
    this.score = 0;
    this.turns = 0;
    this.ui.updateScore(0);
    this.gameActive = true;
    this.ghostBlock.setVisible(!InputSystem.isTouchDevice());
    this.inputSystem.setActive(true);
    this.spawnNextBlock();
  }

  start(): void {
    // Remove previous block meshes from scene
    for (const block of this.placedBlocks) {
      this.scene.scene.remove(block.mesh);
    }
    this.placedBlocks = [];

    // Reset score
    this.score = 0;
    this.turns = 0;
    this.dropHeight = DROP_HEIGHT;
    this._mousePos.y = DROP_HEIGHT;
    this.ui.updateScore(0);
    this.ui.hideGameOver();
    this.scene.resetCamera();

    // Discard old physics world entirely (avoids constraint/body removal issues)
    // and rebuild platform fresh
    if (this.platform) {
      this.scene.scene.remove(this.platform.mesh);
    }
    this.physics = new PhysicsWorld();
    this.platform = new Platform(this.scene.scene, this.physics);
    this.blockFactory = new BlockFactory(this.scene.scene, this.physics);

    // Trigger game over the moment any block contacts the ground
    this.platform.groundBody.addEventListener('collide', (e: any) => {
      if (this.gameActive && e.body.collisionFilterGroup === COL_BLOCK) {
        this.triggerGameOver('grounded');
      }
    });

    if (this.ghostBlock) {
      this.scene.scene.remove(this.ghostBlock.mesh);
    }
    this.ghostBlock = new GhostBlock(this.scene.scene);
    this.ghostBlock.setVisible(!InputSystem.isTouchDevice());
    this.audio.play();
    this.gameActive = true;
    this.inputSystem.setActive(true);
    this.inputSystem.setDropPlaneHeight(DROP_HEIGHT);

    this.spawnNextBlock();

    if (this._firstRun) {
      this._firstRun = false;
      this.gameActive = false;
      this.ghostBlock.setVisible(false);
      this.inputSystem.setActive(false);
    }

    cancelAnimationFrame(this._rafId);
    this.lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  spawnNextBlock(): void {
    this.currentShapeKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    this.ghostBlock.setShape(this.currentShapeKey);
    this.ghostBlock.setPosition(this._mousePos);
    this.turns++;
  }

  onMouseMove(pos: THREE.Vector3): void {
    if (!this.gameActive) return;

    // Lock z-axis to center of platform (2D movement)
    pos.z = 0;
    
    // Store X position, height will be updated in game loop
    this._mousePos.x = pos.x;
    this._mousePos.z = pos.z;
    
    // Update ghost position with current drop height
    this.ghostBlock.setPosition(this._mousePos);
  }
  
  private calculateDropHeight(xPos: number): number {
    const minHeight = DROP_HEIGHT;
    const searchRadius = 2; // Search for blocks within 2 units horizontally
    let maxY = 0;
    
    // Check placed blocks
    for (const block of this.placedBlocks) {
      const blockX = block.body.position.x;
      const blockY = block.body.position.y;
      
      // Check if block is near the cursor X position
      if (Math.abs(blockX - xPos) < searchRadius) {
        maxY = Math.max(maxY, blockY);
      }
    }
    
    // Calculate platform height at this x position accounting for rotation
    const tiltAngle = this.platform.getTiltAngle();
    const rockerRadius = 3.6; // ROCKER_RADIUS
    const blockSize = 1; // BLOCK_SIZE
    const platformCenterY = rockerRadius + blockSize / 2;
    
    // Height of platform center at position x when tilted around pivot at origin
    // The platform rotates around the bottom (pivot at y=0), so we need to calculate
    // the height of a point at horizontal offset xPos from center
    const platformCenterAtX = platformCenterY * Math.cos(tiltAngle) + xPos * Math.sin(tiltAngle);
    
    // Add clearance for the rotated block segments on the platform
    // When tilted, the diagonal of the rotated cube extends higher
    const platformTopAtX = platformCenterAtX + blockSize * 0.7;
    
    // Use the higher of blocks or platform
    maxY = Math.max(maxY, platformTopAtX);
    
    // Drop height is either minimum or 3 units above highest point
    return Math.max(minHeight, maxY + 3);
  }

  onDrop(): void {
    if (!this.gameActive) return;
    const now = performance.now();
    if (now - this.lastDropTime < this.DROP_COOLDOWN_MS) return;
    this.lastDropTime = now;

    const dropPos = this.ghostBlock.getDropPosition();
    const rotation = this.ghostBlock.getRotation();
    const platformTilt = this.platform.getTiltAngle();

    const spawnPos = new CANNON.Vec3(dropPos.x, dropPos.y + 0.5, dropPos.z);
    const block = this.blockFactory.createBlock(this.currentShapeKey, spawnPos, rotation, platformTilt);

    // Give gentle downward velocity to avoid clipping through platform
    block.body.velocity.set(0, -2, 0);

    this.audio.playDrop();

    // Play thud on collision, throttled to once per 120ms per block
    let lastHit = 0;
    block.body.addEventListener('collide', (e: any) => {
      const now = performance.now();
      if (now - lastHit < 120) return;
      lastHit = now;
      const vel = e.contact.getImpactVelocityAlongNormal();
      this.audio.playHit(Math.abs(vel));
    });

    this.placedBlocks.push(block);
    this.score += 10;
    this.ui.updateScore(this.score);

    // Unlock platform rotation once enough weight is on it (minimum 3 blocks)
    if (this.platform.isRotationLocked() && this.placedBlocks.length >= 3) {
      this.platform.unlockRotation();
    }

    // Zoom camera out slightly (drop height will be recalculated in update loop)
    this.scene.nudgeOut(0.7, 0.3);

    this.spawnNextBlock();
  }

  onRotate(): void {
    if (!this.gameActive) return;
    this.ghostBlock.rotateStep();
  }

  update(dt: number): void {
    this.physics.step(dt);
    this.platform.update(); // Apply rotation lock if active
    this.platform.syncMesh();
    this.scene.updateCamera(dt);
    this.scene.updateClouds(dt);

    for (const block of this.placedBlocks) {
      this.blockFactory.syncMeshToBody(block);
    }

    if (this.gameActive) {
      // Update drop height continuously based on current mouse X position
      this.dropHeight = this.calculateDropHeight(this._mousePos.x);
      this._mousePos.y = this.dropHeight;
      this.inputSystem.setDropPlaneHeight(this.dropHeight);
      
      // Update ghost block position and tilt
      this.ghostBlock.setPosition(this._mousePos);
      this.ghostBlock.setPlatformTilt(this.platform.getTiltAngle());
      
      const result = this.gameOverDetector.check(this.platform, this.placedBlocks);
      if (result) {
        this.triggerGameOver(result);
      }
    }
  }

  triggerGameOver(reason: string): void {
    this.gameActive = false;
    this.inputSystem.setActive(false);
    this.ghostBlock.setVisible(false);
    this.ui.showGameOver(reason);
  }

  loop(timestamp: number): void {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05); // cap dt
    this.lastTime = timestamp;

    if (this.ui.isPaused()) {
      this.scene.render();
      this._rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    this.update(dt);
    this.scene.render();

    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
