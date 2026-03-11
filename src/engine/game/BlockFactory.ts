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
    rotationZ: number = 0,
    platformTilt: number = 0
  ): PlacedBlock {
    const offsets = SHAPES[shapeKey];
    const color = COLORS[shapeKey];

    // Center the shape around (0,0)
    const centerX = offsets.reduce((s, o) => s + o[0], 0) / offsets.length;
    const centerY = offsets.reduce((s, o) => s + o[1], 0) / offsets.length;

    const body = new CANNON.Body({ mass: BLOCK_MASS, material: this.physicsWorld.blockMaterial });
    body.sleepSpeedLimit = 0.5;
    body.sleepTimeLimit = 1;
    body.collisionFilterGroup = COL_BLOCK;
    body.collisionFilterMask = COL_GROUND | COL_PLATFORM | COL_BLOCK;
    // Restrict movement to the XY plane: suppress Z translation and only allow Z-axis rotation
    body.linearFactor.set(1, 1, 0.05);
    body.angularFactor.set(0, 0, 1);

    const mesh = new THREE.Group();
    const geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const mat = new THREE.MeshLambertMaterial({ color });

    for (const [dx, dy, dz] of offsets) {
      // Center offset — kept unrotated; body quaternion handles all rotation
      const cx = dx - centerX;
      const cy = dy - centerY;

      const offsetVec = new CANNON.Vec3(cx * BLOCK_SIZE, cy * BLOCK_SIZE, dz * BLOCK_SIZE);
      body.addShape(new CANNON.Box(halfExt), offsetVec);

      // Visual cubes without rotation - they'll be rotated by the mesh group
      const cellMesh = new THREE.Mesh(geo, mat);
      cellMesh.position.set(cx * BLOCK_SIZE, cy * BLOCK_SIZE, dz * BLOCK_SIZE);
      cellMesh.castShadow = true;
      cellMesh.receiveShadow = true;
      mesh.add(cellMesh);
    }

    body.position.copy(position);
    
    // Apply full rotation: user rotation + 45-degree platform zigzag offset + platform tilt
    const totalRotation = new CANNON.Quaternion();
    totalRotation.setFromEuler(0, 0, rotationZ + Math.PI / 4 + platformTilt);
    body.quaternion.copy(totalRotation);
    
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
