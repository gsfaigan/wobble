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
import { SHAPE_KEYS, PLATFORM_WIDTH, PLATFORM_DEPTH, DROP_HEIGHT } from './constants';

export class GameManager {
  private scene: SceneManager;
  private physics: PhysicsWorld;
  private platform!: Platform;
  private blockFactory!: BlockFactory;
  private ghostBlock!: GhostBlock;
  private inputSystem!: InputSystem;
  private gameOverDetector: GameOverDetector;
  private ui: UIManager;

  private placedBlocks: PlacedBlock[] = [];
  private score: number = 0;
  private turns: number = 0;
  private gameActive: boolean = false;
  private currentShapeKey: string = 'I';

  private lastTime: number = 0;
  private _mousePos: THREE.Vector3 = new THREE.Vector3(0, DROP_HEIGHT, 0);
  private _rafId: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.scene = new SceneManager(canvas);
    this.physics = new PhysicsWorld();
    this.gameOverDetector = new GameOverDetector();
    this.ui = new UIManager();

    this.ui.onRestart(() => this.start());

    window.addEventListener('resize', () => this.scene.onResize());

    this._init();
  }

  private _init(): void {
    this.platform = new Platform(this.scene.scene, this.physics);
    this.blockFactory = new BlockFactory(this.scene.scene, this.physics);
    this.ghostBlock = new GhostBlock(this.scene.scene);

    this.inputSystem = new InputSystem(
      this.scene.camera,
      this.scene.scene,
      (pos) => this.onMouseMove(pos),
      () => this.onDrop(),
      () => this.onRotate()
    );
  }

  start(): void {
    // Clean up previous blocks
    for (const block of this.placedBlocks) {
      this.blockFactory.removeBlock(block);
    }
    this.placedBlocks = [];

    // Reset score
    this.score = 0;
    this.turns = 0;
    this.ui.updateScore(0);
    this.ui.updateTurns(0);
    this.ui.hideGameOver();

    // Rebuild physics/platform if restarting
    if (this.platform) {
      // Remove old bodies
      this.physics.removeBody(this.platform.platformBody);
      this.physics.removeBody(this.platform.pivotBody);
      this.scene.scene.remove(this.platform.mesh);

      // Remove constraints — recreate world
      this.physics = new PhysicsWorld();
    }

    this.platform = new Platform(this.scene.scene, this.physics);
    this.blockFactory = new BlockFactory(this.scene.scene, this.physics);

    this.ghostBlock.setVisible(true);
    this.gameActive = true;
    this.inputSystem.setActive(true);

    this.spawnNextBlock();

    // Start loop if not running
    cancelAnimationFrame(this._rafId);
    this.lastTime = performance.now();
    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }

  spawnNextBlock(): void {
    this.currentShapeKey = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    this.ghostBlock.setShape(this.currentShapeKey);
    this.ghostBlock.setPosition(this._mousePos);
    this.turns++;
    this.ui.updateTurns(this.turns);
  }

  onMouseMove(pos: THREE.Vector3): void {
    if (!this.gameActive) return;

    // Clamp to platform area
    const halfW = PLATFORM_WIDTH / 2 - 0.5;
    const halfD = PLATFORM_DEPTH / 2 - 0.5;
    pos.x = Math.max(-halfW, Math.min(halfW, pos.x));
    pos.z = Math.max(-halfD, Math.min(halfD, pos.z));
    pos.y = DROP_HEIGHT;

    this._mousePos.copy(pos);
    this.ghostBlock.setPosition(pos);
  }

  onDrop(): void {
    if (!this.gameActive) return;

    const dropPos = this.ghostBlock.getDropPosition();
    const rotation = this.ghostBlock.getRotation();

    const spawnPos = new CANNON.Vec3(dropPos.x, dropPos.y + 0.5, dropPos.z);
    const block = this.blockFactory.createBlock(this.currentShapeKey, spawnPos, rotation);

    // Give downward velocity
    block.body.velocity.set(0, -4, 0);

    this.placedBlocks.push(block);
    this.score += 10;
    this.ui.updateScore(this.score);

    this.spawnNextBlock();
  }

  onRotate(): void {
    if (!this.gameActive) return;
    this.ghostBlock.rotateStep();
  }

  update(dt: number): void {
    this.physics.step(dt);
    this.platform.syncMesh();

    for (const block of this.placedBlocks) {
      this.blockFactory.syncMeshToBody(block);
    }

    if (this.gameActive) {
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

    this.update(dt);
    this.scene.render();

    this._rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
