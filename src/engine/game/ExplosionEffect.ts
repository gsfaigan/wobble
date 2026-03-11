import * as THREE from 'three';

const PARTICLE_COUNT = 180;
const DURATION = 2.2; // seconds — matches game over delay

export class ExplosionEffect {
  private mesh: THREE.InstancedMesh;
  private velocities: THREE.Vector3[] = [];
  private elapsed = 0;
  private done = false;

  constructor(scene: THREE.Scene, origin: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(geo, mat, PARTICLE_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.7; // upward bias
      const speed = 6 + Math.random() * 16;
      this.velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed + 4,
        Math.sin(phi) * Math.sin(theta) * speed * 0.4, // flatten Z (camera faces Z)
      ));

      dummy.position.copy(origin);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);

      // Orange / red / yellow variation
      const t = Math.random();
      this.mesh.setColorAt(i, new THREE.Color().setHSL(0.05 + t * 0.08, 1, 0.5 + t * 0.2));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    scene.add(this.mesh);
  }

  /** Returns true when the effect is finished and can be disposed. */
  update(dt: number): boolean {
    if (this.done) return true;
    this.elapsed += dt;
    const progress = this.elapsed / DURATION;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.mesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      dummy.position.addScaledVector(this.velocities[i], dt);
      this.velocities[i].y -= 12 * dt; // gravity

      // Quadratic shrink — snappy disappearance near the end
      const s = Math.max(0, 1 - progress);
      dummy.scale.setScalar(s * s);

      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    if (this.elapsed >= DURATION) this.done = true;
    return this.done;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
