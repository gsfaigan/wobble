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
  groundBody: CANNON.Body;
  mesh: THREE.Group;

  private physicsWorld: PhysicsWorld;
  private rotationLocked: boolean = true;
  
  // Zigzag platform parameters - edit these to adjust the platform shape
  private readonly xSpacing = BLOCK_SIZE * Math.sqrt(2)/2; // Horizontal spacing between segments
  private readonly numSegments = Math.ceil(PLATFORM_WIDTH / this.xSpacing); // Fill full width
  private readonly zigzagOffset = BLOCK_SIZE / Math.sqrt(2); // Vertical offset between segments

  constructor(scene: THREE.Scene, physicsWorld: PhysicsWorld) {
    this.physicsWorld = physicsWorld;
    this.mesh = new THREE.Group();

    // Static ground plane — blocks land on it, platform does NOT collide with it
    this.groundBody = new CANNON.Body({ mass: 0 });
    const groundBody = this.groundBody;
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
    this.platformBody = new CANNON.Body({ mass: 15, material: physicsWorld.platformMaterial });
    this.platformBody.linearDamping = 0.6;
    this.platformBody.angularDamping = 0.99;

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
    // Create stone texture for platform and arm
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 128;
    stoneCanvas.height = 128;
    const stoneCtx = stoneCanvas.getContext('2d')!;
    
    // Base stone color
    stoneCtx.fillStyle = '#6b6b6b';
    stoneCtx.fillRect(0, 0, 128, 128);
    
    // Add stone texture variation
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const brightness = Math.random() * 60 - 30;
      const gray = Math.floor(107 + brightness);
      stoneCtx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      stoneCtx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    
    // Add darker cracks/lines
    for (let i = 0; i < 20; i++) {
      stoneCtx.strokeStyle = `rgba(40, 40, 40, ${Math.random() * 0.3 + 0.1})`;
      stoneCtx.lineWidth = Math.random() * 1.5 + 0.5;
      stoneCtx.beginPath();
      stoneCtx.moveTo(Math.random() * 128, Math.random() * 128);
      stoneCtx.lineTo(Math.random() * 128, Math.random() * 128);
      stoneCtx.stroke();
    }
    
    const stoneTexture = new THREE.CanvasTexture(stoneCanvas);
    stoneTexture.wrapS = THREE.RepeatWrapping;
    stoneTexture.wrapT = THREE.RepeatWrapping;
    
    // Platform board - zigzag pattern (up-down along x-axis)
    const segmentGeo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    const boardMat = new THREE.MeshLambertMaterial({ 
      map: stoneTexture,
      color: 0xffffff
    });
    
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
    }

    // Vertical support arm extending from below ground - square cross-section, 1 unit wide
    const armHeight = ROCKER_RADIUS + BLOCK_SIZE / 2;
    const belowGround = 1.5; // How far below ground it extends
    const totalArmHeight = armHeight + belowGround;
    const armGeo = new THREE.BoxGeometry(BLOCK_SIZE, totalArmHeight, BLOCK_SIZE);
    const armMat = new THREE.MeshLambertMaterial({ 
      map: stoneTexture.clone(),
      color: 0xffffff
    });
    const armMesh = new THREE.Mesh(armGeo, armMat);
    armMesh.receiveShadow = true;
    armMesh.castShadow = true;
    // Position so it extends from below ground to the platform
    armMesh.position.set(0, -(armHeight + belowGround) / 2, 0);
    this.mesh.add(armMesh);

    scene.add(this.mesh);

    // Ground plane (visual) with grass texture - large expanse
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    
    // Create a simple grass texture using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Base grass color
    ctx.fillStyle = '#2d5a1e';
    ctx.fillRect(0, 0, 256, 256);
    
    // Add some texture variation
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const brightness = Math.random() * 40 - 20;
      const green = Math.floor(90 + brightness);
      const red = Math.floor(45 + brightness / 2);
      ctx.fillStyle = `rgb(${red}, ${green}, ${Math.floor(30 + brightness / 3)})`;
      ctx.fillRect(x, y, 2, 2);
    }
    
    const grassTexture = new THREE.CanvasTexture(canvas);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(8, 8);
    
    const groundMat = new THREE.MeshLambertMaterial({ 
      map: grassTexture,
      color: 0xffffff
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add tall lush grass blades sticking out of the ground using instancing for performance
    const bladesCount = 4000;
    
    // Create a thin blade shape using a tapered plane
    const bladeGeometry = new THREE.PlaneGeometry(0.04, 0.4, 1, 3);
    // Taper the blade - modify vertices to make it pointy at the top
    const positions = bladeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const taper = (y + 0.2) / 0.4; // 0 at bottom, 1 at top
      const x = positions.getX(i);
      positions.setX(i, x * taper * 0.5); // Taper to point
    }
    positions.needsUpdate = true;
    
    const bladeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x4a9a3a,
      side: THREE.DoubleSide,
      flatShading: false
    });
    
    const instancedGrass = new THREE.InstancedMesh(bladeGeometry, bladeMaterial, bladesCount);
    
    const dummy = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    
    for (let i = 0; i < bladesCount; i++) {
      // Random position across the ground
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      dummy.position.set(x, 0.2, z);
      
      // Random rotation
      dummy.rotation.y = Math.random() * Math.PI * 2;
      
      // Slight tilt for natural look
      dummy.rotation.x = (Math.random() - 0.5) * 0.3;
      dummy.rotation.z = (Math.random() - 0.5) * 0.3;
      
      // Vary height
      const heightScale = 0.8 + Math.random() * 0.5;
      dummy.scale.set(1, heightScale, 1);
      
      dummy.updateMatrix();
      instancedGrass.setMatrixAt(i, dummy.matrix);
      
      // Vary color slightly for each blade
      const greenVariation = 0.8 + Math.random() * 0.4;
      instancedGrass.setColorAt(i, new THREE.Color(
        0.2 * greenVariation,
        0.6 * greenVariation, 
        0.25 * greenVariation
      ));
    }
    
    instancedGrass.instanceMatrix.needsUpdate = true;
    if (instancedGrass.instanceColor) {
      instancedGrass.instanceColor.needsUpdate = true;
    }
    
    scene.add(instancedGrass);

    // --- Flowers (~150 instances) ---
    const flowerCount = 150;
    const flowerPositions: [number, number][] = [];
    while (flowerPositions.length < flowerCount) {
      const fx = (Math.random() - 0.5) * 160;
      const fz = (Math.random() - 0.5) * 160;
      if (Math.sqrt(fx * fx + fz * fz) >= 5) {
        flowerPositions.push([fx, fz]);
      }
    }

    // Stems
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.04, 1, 5);
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x3a8a2a });
    const instancedStems = new THREE.InstancedMesh(stemGeo, stemMat, flowerCount);
    instancedStems.receiveShadow = true;

    // Flower tops
    const petalGeo = new THREE.CircleGeometry(0.12, 8);
    const petalMat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    const instancedPetals = new THREE.InstancedMesh(petalGeo, petalMat, flowerCount);
    instancedPetals.receiveShadow = true;

    const petalColors = [
      new THREE.Color(0xffee44), // yellow
      new THREE.Color(0xff88bb), // pink
      new THREE.Color(0xff3333), // red
      new THREE.Color(0xffffff), // white
      new THREE.Color(0xff8833), // orange
      new THREE.Color(0xcc88ff), // lavender
      new THREE.Color(0xff44cc), // magenta
    ];

    const flowerDummy = new THREE.Object3D();
    for (let i = 0; i < flowerCount; i++) {
      const [fx, fz] = flowerPositions[i];
      const stemHeight = 0.25 + Math.random() * 0.3; // 0.25–0.55

      // Stem
      flowerDummy.position.set(fx, stemHeight / 2, fz);
      flowerDummy.rotation.set(0, 0, 0);
      flowerDummy.scale.set(1, stemHeight, 1);
      flowerDummy.updateMatrix();
      instancedStems.setMatrixAt(i, flowerDummy.matrix);

      // Petal disc (flat, facing up)
      flowerDummy.position.set(fx, stemHeight, fz);
      flowerDummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2);
      flowerDummy.scale.set(1, 1, 1);
      flowerDummy.updateMatrix();
      instancedPetals.setMatrixAt(i, flowerDummy.matrix);
      instancedPetals.setColorAt(i, petalColors[Math.floor(Math.random() * petalColors.length)]);
    }

    instancedStems.instanceMatrix.needsUpdate = true;
    instancedPetals.instanceMatrix.needsUpdate = true;
    if (instancedPetals.instanceColor) instancedPetals.instanceColor.needsUpdate = true;

    scene.add(instancedStems);
    scene.add(instancedPetals);

    // --- Boulders (clustered, ~120 instances) ---
    const bouldersPerCluster = 8 + Math.floor(Math.random() * 6); // 8–13 per cluster
    const clusterCount = 12;
    const boulderPositions: [number, number][] = [];

    for (let c = 0; c < clusterCount; c++) {
      // Pick a cluster center far enough from origin
      let cx = 0, cz = 0;
      do {
        cx = (Math.random() - 0.5) * 150;
        cz = (Math.random() - 0.5) * 150;
      } while (Math.sqrt(cx * cx + cz * cz) < 10);

      const spread = 4 + Math.random() * 5; // cluster radius 4–9
      for (let b = 0; b < bouldersPerCluster; b++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * spread;
        boulderPositions.push([cx + Math.cos(angle) * dist, cz + Math.sin(angle) * dist]);
      }
    }
    const boulderCount = boulderPositions.length;

    const boulderGeo = new THREE.IcosahedronGeometry(1, 1);
    const boulderMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const instancedBoulders = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
    instancedBoulders.receiveShadow = true;
    instancedBoulders.castShadow = true;

    const boulderDummy = new THREE.Object3D();
    for (let i = 0; i < boulderCount; i++) {
      const [bx, bz] = boulderPositions[i];
      const size = 0.3 + Math.random() * 0.9; // 0.3–1.2
      const sx = size * (0.7 + Math.random() * 0.6);
      const sy = size * (0.7 + Math.random() * 0.6);
      const sz = size * (0.7 + Math.random() * 0.6);

      boulderDummy.position.set(bx, sy * 0.5, bz);
      boulderDummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      boulderDummy.scale.set(sx, sy, sz);
      boulderDummy.updateMatrix();
      instancedBoulders.setMatrixAt(i, boulderDummy.matrix);

      // Slight gray/brown variation
      const grayTone = 0.45 + Math.random() * 0.25;
      const brownTint = Math.random() * 0.08;
      instancedBoulders.setColorAt(i, new THREE.Color(grayTone + brownTint, grayTone, grayTone - brownTint * 0.5));
    }

    instancedBoulders.instanceMatrix.needsUpdate = true;
    if (instancedBoulders.instanceColor) instancedBoulders.instanceColor.needsUpdate = true;

    scene.add(instancedBoulders);

    // --- Mountains ---
    // Mid-distance hills (radius 65–90): gray-green, height 8–20
    const hillCount = 20;
    for (let i = 0; i < hillCount; i++) {
      const angle = (i / hillCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const radius = 65 + Math.random() * 25;
      const mx = Math.cos(angle) * radius;
      const mz = Math.sin(angle) * radius;
      const height = 8 + Math.random() * 12;
      const baseRadius = 10 + Math.random() * 12;

      const hillProfile: THREE.Vector2[] = [];
      for (let p = 0; p <= 10; p++) {
        const t = (p / 10) * (Math.PI / 2);
        hillProfile.push(new THREE.Vector2(baseRadius * Math.cos(t), -height / 2 + height * Math.sin(t)));
      }
      const geo = new THREE.LatheGeometry(hillProfile, 6 + Math.floor(Math.random() * 4));

      const mat = new THREE.MeshLambertMaterial({ map: grassTexture, color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(mx, height / 2 - 0.5, mz);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Far background mountains (radius 95–145): blue-gray, height 25–65
    const mountainCount = 28;
    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / mountainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const radius = 95 + Math.random() * 50;
      const mx = Math.cos(angle) * radius;
      const mz = Math.sin(angle) * radius;
      const height = 25 + Math.random() * 40;
      const baseRadius = 14 + Math.random() * 16;

      const mtProfile: THREE.Vector2[] = [];
      for (let p = 0; p <= 10; p++) {
        const t = (p / 10) * (Math.PI / 2);
        mtProfile.push(new THREE.Vector2(baseRadius * Math.cos(t), -height / 2 + height * Math.sin(t)));
      }
      const geo = new THREE.LatheGeometry(mtProfile, 7 + Math.floor(Math.random() * 4));

      const mat = new THREE.MeshLambertMaterial({ map: grassTexture, color: 0xffffff });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(mx, height / 2 - 0.5, mz);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  }

  getTiltAngle(): number {
    const q = this.platformBody.quaternion;
    // Extract Z rotation from quaternion
    const sinz_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosz_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
    const zAngle = Math.atan2(sinz_cosp, cosz_cosp);
    return zAngle; // Return signed angle for block alignment
  }

  unlockRotation(): void {
    if (this.rotationLocked) {
      this.rotationLocked = false;
    }
  }

  // Apply a small tilt nudge when a block is placed.
  // xOffset: block x position (platform center is 0).
  nudgeTilt(xOffset: number): void {
    const halfWidth = PLATFORM_WIDTH / 2;
    const normalized = Math.max(-1, Math.min(1, xOffset / halfWidth));
    // Positive x → tip clockwise → negative Z angular velocity
    this.platformBody.angularVelocity.z -= normalized * 0.35;
    this.platformBody.wakeUp();
  }

  // Proportional controller: each frame nudge angular velocity toward the target tilt angle.
  driveTowardAngle(targetAngle: number): void {
    const error = targetAngle - this.getTiltAngle();
    this.platformBody.angularVelocity.z += error * 0.15;
    this.platformBody.wakeUp();
  }

  isRotationLocked(): boolean {
    return this.rotationLocked;
  }

  update(): void {
    // Apply rotation lock by heavily damping angular velocity
    if (this.rotationLocked) {
      this.platformBody.angularVelocity.scale(0.8, this.platformBody.angularVelocity);
    }
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
