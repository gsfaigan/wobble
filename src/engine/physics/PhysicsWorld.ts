import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  world: CANNON.World;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.allowSleep = true;
  }

  step(dt: number): void {
    this.world.step(1 / 60, dt, 3);
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
