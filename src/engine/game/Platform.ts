import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import {
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  PLATFORM_DEPTH,
  ROCKER_RADIUS,
  BLOCK_SIZE,
  COL_GROUND,
  COL_BLOCK,
  COL_PLATFORM,
} from './constants';

export class Platform {
  platformBody: CANNON.Body;
  pivotBody: CANNON.Body;
  mesh: THREE.Group;

  private physicsWorld: PhysicsWorld;
  
  // Zigzag platform parameters - edit these to adjust the platform shape
  private readonly xSpacing = BLOCK_SIZE * Math.sqrt(2)/2; // Horizontal spacing between segments
  private readonly numSegments = Math.ceil(PLATFORM_WIDTH / this.xSpacing); // Fill full width
  private readonly zigzagOffset = BLOCK_SIZE / Math.sqrt(2); // Vertical offset between segments

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.physicsWorld = physicsWorld;
    this.mesh = new THREE.Group();

    // Static ground plane — blocks land on it, platform does NOT collide with it
    const groundBody = new CANNON.Body({ mass: 0 });
    const groundPlane = new CANNON.Plane();
    groundBody.addShape(groundPlane);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.set(0, 0, 0);
    groundBody.collisionFilterGroup = COL_GROUND;
    groundBody.collisionFilterMask = COL_BLOCK | COL_PLATFORM;
    physicsWorld.addBody(groundBody);

    // Static pivot/anchor at ground level
    this.pivotBody = new CANNON.Body({ mass: 0 });
    this.pivotBody.addShape(new CANNON.Sphere(0.01));
    this.pivotBody.position.set(0, 0, 0);
    this.pivotBody.collisionFilterGroup = COL_PLATFORM;
    this.pivotBody.collisionFilterMask = 0; // collides with nothing
    physicsWorld.addBody(this.pivotBody);

    // Platform board — center sits at ROCKER_RADIUS + half-height so arc bottom touches y=0
    // Create zigzag pattern with alternating y-positions (up-down along x-axis)
    const platformY = ROCKER_RADIUS + BLOCK_SIZE / 2;
    this.platformBody = new CANNON.Body({ mass: 5 });
    
    // Quaternions for alternating 45 degree rotations around z-axis
    const rotation45CW = new CANNON.Quaternion();
    rotation45CW.setFromEuler(0, 0, Math.PI / 4);
    const rotation45CCW = new CANNON.Quaternion();
    rotation45CCW.setFromEuler(0, 0, -Math.PI / 4);
    
    // Center the zigzag on the platform
    const totalWidth = (this.numSegments - 1) * this.xSpacing;
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < this.numSegments; i++) {
      const xPos = startX + i * this.xSpacing;
      const yPos = (i % 2 === 0) ? -this.zigzagOffset / 2 : this.zigzagOffset / 2;
      const rotation = (i % 2 === 0) ? rotation45CW : rotation45CCW;
      
      const segmentShape = new CANNON.Box(
        new CANNON.Vec3(BLOCK_SIZE / 2, BLOCK_SIZE / 2, BLOCK_SIZE / 2)
      );
      this.platformBody.addShape(segmentShape, new CANNON.Vec3(xPos, yPos, 0), rotation);
    }
    
    this.platformBody.position.set(0, platformY, 0);
    this.platformBody.linearDamping = 0.6;
    this.platformBody.angularDamping = 0.95;
    this.platformBody.collisionFilterGroup = COL_PLATFORM;
    this.platformBody.collisionFilterMask = COL_BLOCK | COL_GROUND;
    physicsWorld.addBody(this.platformBody);

    // Hinge: Z-axis only rotation; pivotB = bottom of arc in platform local space
    const hinge = new CANNON.HingeConstraint(this.pivotBody, this.platformBody, {
      pivotA: new CANNON.Vec3(0, 0, 0),
      axisA: new CANNON.Vec3(0, 0, 1),
      pivotB: new CANNON.Vec3(0, -platformY, 0),
      axisB: new CANNON.Vec3(0, 0, 1),
    });
    physicsWorld.world.addConstraint(hinge);

    // Three.js visual
    this._buildMesh(scene);
    this.syncMesh();
  }

  private _buildMesh(scene: THREE.Scene): void {
    // Platform board - zigzag pattern (up-down along x-axis)
    const segmentGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x334455 });
    
    // Center the zigzag on the platform
    const totalWidth = (this.numSegments - 1) * this.xSpacing;
    const startX = -totalWidth / 2;
    
    for (let i = 0; i < this.numSegments; i++) {
      const xPos = startX + i * this.xSpacing;
      const yPos = (i % 2 === 0) ? -this.zigzagOffset / 2 : this.zigzagOffset / 2;
      const rotationZ = (i % 2 === 0) ? Math.PI / 4 : -Math.PI / 4; // Alternate rotation direction
      
      const segmentMesh = new THREE.Mesh(segmentGeo, boardMat);
      segmentMesh.position.set(xPos, yPos, 0);
      segmentMesh.rotation.z = rotationZ;
      segmentMesh.receiveShadow = true;
      segmentMesh.castShadow = true;
      this.mesh.add(segmentMesh);
      
      // Edge highlights for each segment
      const edgeGeo = new THREE.EdgesGeometry(segmentGeo);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x6688aa });
      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      segmentMesh.add(edges);
    }

    // Rocker base (visual only) — half-cylinder with curved side down
    // phiStart=-PI/2 + rotation.x=PI/2 → arc runs from -X through bottom(-Y) to +X
    const rockerGeo = new THREE.CylinderGeometry(
      ROCKER_RADIUS, ROCKER_RADIUS, PLATFORM_DEPTH, 32, 1, false,
      -Math.PI / 2, Math.PI
    );
    const rockerMat = new THREE.MeshLambertMaterial({ color: 0x223344, side: THREE.DoubleSide });
    const rockerMesh = new THREE.Mesh(rockerGeo, rockerMat);
    rockerMesh.receiveShadow = true;
    // Rotate so cylinder axis runs along Z (front-to-back), curved side faces down
    rockerMesh.rotation.x = Math.PI / 2;
    // Flat edge of semicircle aligns with bottom face of board
    rockerMesh.position.set(0, -PLATFORM_HEIGHT / 2, 0);
    this.mesh.add(rockerMesh);

    scene.add(this.mesh);

    // Ground plane (visual)
    const groundGeo = new THREE.PlaneGeometry(40, 40);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x111122 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  getTiltAngle(): number {
    const q = this.platformBody.quaternion;
    // Extract Z rotation from quaternion
    const sinz_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosz_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const zAngle = Math.atan2(sinz_cosp, cosz_cosp);
    return zAngle; // Return signed angle for block alignment
  }
  
  getTiltAngleAbs(): number {
    return Math.abs(this.getTiltAngle());
  }

  syncMesh(): void {
    const p = this.platformBody.position;
    const qq = this.platformBody.quaternion;
    this.mesh.position.set(p.x, p.y, p.z);
    this.mesh.quaternion.set(qq.x, qq.y, qq.z, qq.w);
  }
}
