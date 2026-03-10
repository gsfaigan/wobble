import * as THREE from 'three';
import { BLOCK_SIZE, SHAPES, COLORS } from './constants';

export class GhostBlock {
  mesh: THREE.Group;
  currentShape: string = 'I';
  rotationY: number = 0; // radians: 0, π/2, π, 3π/2

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
    const centerZ = offsets.reduce((s, o) => s + o[2], 0) / offsets.length;
    const cosR = Math.cos(this.rotationY);
    const sinR = Math.sin(this.rotationY);

    for (const [dx, dy, dz] of offsets) {
      const cx = dx - centerX;
      const cz = dz - centerZ;
      const rx = cx * cosR - cz * sinR;
      const rz = cx * sinR + cz * cosR;

      const cell = new THREE.Mesh(geo, mat);
      cell.position.set(rx * BLOCK_SIZE, dy * BLOCK_SIZE, rz * BLOCK_SIZE);
      this.mesh.add(cell);
    }
  }

  setPosition(worldPos: THREE.Vector3): void {
    this._pos.copy(worldPos);
    this.mesh.position.copy(worldPos);
  }

  rotateStep(): void {
    this.rotationY = (this.rotationY + Math.PI / 2) % (Math.PI * 2);
    this._rebuild();
  }

  getDropPosition(): THREE.Vector3 {
    return this._pos.clone();
  }

  getRotation(): number {
    return this.rotationY;
  }

  setVisible(v: boolean): void {
    this.mesh.visible = v;
  }
}
