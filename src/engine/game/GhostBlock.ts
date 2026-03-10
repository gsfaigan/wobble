import * as THREE from 'three';
import { BLOCK_SIZE, SHAPES, COLORS } from './constants';

export class GhostBlock {
  mesh: THREE.Group;
  currentShape: string = 'I';
  rotationZ: number = 0; // radians: 0, π/2, π, 3π/2 around Z-axis
  platformTilt: number = 0; // current platform tilt angle

  private scene: THREE.Scene;
  private _pos: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    scene.add(this.mesh);
    this.setShape('I');
  }

  setShape(shapeKey: string): void {
    this.currentShape = shapeKey;
    this._rebuild();
  }

  private _rebuild(): void {
    // Clear existing children
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const offsets = SHAPES[this.currentShape];
    const color = COLORS[this.currentShape];
    const geo = new THREE.BoxGeometry(BLOCK_SIZE * 0.92, BLOCK_SIZE * 0.92, BLOCK_SIZE * 0.92);
    const mat = new THREE.MeshBasicMaterial({
      color,
      opacity: 0.35,
      transparent: true,
    });

    const centerX = offsets.reduce((s, o) => s + o[0], 0) / offsets.length;
    const centerY = offsets.reduce((s, o) => s + o[1], 0) / offsets.length;

    for (const [dx, dy, dz] of offsets) {
      const cx = dx - centerX;
      const cy = dy - centerY;

      const cell = new THREE.Mesh(geo, mat);
      cell.position.set(cx * BLOCK_SIZE, cy * BLOCK_SIZE, dz * BLOCK_SIZE);
      this.mesh.add(cell);
    }
    
    this._updateRotation();
  }
  
  private _updateRotation(): void {
    // Apply user rotation, 45-degree platform offset, and current platform tilt
    this.mesh.rotation.z = this.rotationZ + Math.PI / 4 + this.platformTilt;
  }

  setPosition(worldPos: THREE.Vector3): void {
    this._pos.copy(worldPos);
    this.mesh.position.copy(worldPos);
  }
  
  setPlatformTilt(tilt: number): void {
    this.platformTilt = tilt;
    this._updateRotation();
  }

  rotateStep(): void {
    this.rotationZ = (this.rotationZ + Math.PI / 2) % (Math.PI * 2);
    this._rebuild();
  }

  getDropPosition(): THREE.Vector3 {
    return this._pos.clone();
  }

  getRotation(): number {
    return this.rotationZ;
  }

  setVisible(v: boolean): void {
    this.mesh.visible = v;
  }
}
