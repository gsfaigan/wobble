import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { BLOCK_MASS, BLOCK_SIZE, SHAPES, COLORS, COL_BLOCK, COL_GROUND, COL_PLATFORM } from './constants';

export interface PlacedBlock {
  body: CANNON.Body;
  mesh: THREE.Group;
  shapeKey: string;
}

const halfExt = new CANNON.Vec3(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2);
const boxShape = new CANNON.Box(halfExt);

export class BlockFactory {
  private scene: THREE.Scene;
  private physicsWorld: PhysicsWorld;

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  createBlock(
    shapeKey: string,
    position: CANNON.Vec3,
    rotationY: number = 0
  ): PlacedBlock {
    const offsets = SHAPES[shapeKey];
    const color = COLORS[shapeKey];

    // Center the shape around (0,0)
    const centerX = offsets.reduce((s, o) => s + o[0], 0) / offsets.length;
    const centerZ = offsets.reduce((s, o) => s + o[2], 0) / offsets.length;

    const body = new CANNON.Body({ mass: BLOCK_MASS });
    body.sleepSpeedLimit = 0.5;
    body.sleepTimeLimit = 1;
    body.collisionFilterGroup = COL_BLOCK;
    body.collisionFilterMask = COL_GROUND | COL_PLATFORM | COL_BLOCK;

    const mesh = new THREE.Group();
    const geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const mat = new THREE.MeshLambertMaterial({ color });

    const cosR = Math.cos(rotationY);
    const sinR = Math.sin(rotationY);

    for (const [dx, dy, dz] of offsets) {
      // Center offset
      const cx = dx - centerX;
      const cz = dz - centerZ;
      // Rotate around Y axis
      const rx = cx * cosR - cz * sinR;
      const rz = cx * sinR + cz * cosR;

      const offsetVec = new CANNON.Vec3(rx * BLOCK_SIZE, dy * BLOCK_SIZE, rz * BLOCK_SIZE);
      body.addShape(boxShape, offsetVec);

      const cellMesh = new THREE.Mesh(geo, mat);
      cellMesh.position.set(rx * BLOCK_SIZE, dy * BLOCK_SIZE, rz * BLOCK_SIZE);
      cellMesh.castShadow = true;
      cellMesh.receiveShadow = true;
      mesh.add(cellMesh);
    }

    body.position.copy(position);
    this.physicsWorld.addBody(body);
    this.scene.add(mesh);

    return { body, mesh, shapeKey };
  }

  syncMeshToBody(block: PlacedBlock): void {
    const p = block.body.position;
    const q = block.body.quaternion;
    block.mesh.position.set(p.x, p.y, p.z);
    block.mesh.quaternion.set(q.x, q.y, q.z, q.w);
  }

  removeBlock(block: PlacedBlock): void {
    this.physicsWorld.removeBody(block.body);
    this.scene.remove(block.mesh);
  }
}
