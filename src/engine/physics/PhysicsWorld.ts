import * as CANNON from 'cannon-es';

export class PhysicsWorld {
  world: CANNON.World;
  blockMaterial: CANNON.Material;
  platformMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 20;
    this.world.allowSleep = true;

    this.blockMaterial = new CANNON.Material('block');
    this.platformMaterial = new CANNON.Material('platform');

    // Block vs block: no friction
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.blockMaterial, this.blockMaterial,
      { friction: 0, restitution: 0.1, contactEquationStiffness: 1e7, contactEquationRelaxation: 4 }
    ));

    // Block vs platform: minimal friction
    this.world.addContactMaterial(new CANNON.ContactMaterial(
      this.blockMaterial, this.platformMaterial,
      { friction: 0.01, restitution: 0.1, contactEquationStiffness: 1e7, contactEquationRelaxation: 4 }
    ));

    // Default for anything else (e.g. block vs ground)
    this.world.defaultContactMaterial.friction = 0.01;
    this.world.defaultContactMaterial.restitution = 0.1;
    this.world.defaultContactMaterial.contactEquationStiffness = 1; //1e7;
    this.world.defaultContactMaterial.contactEquationRelaxation = 4;
  }

  step(dt: number): void {
    this.world.step(1 / 60, dt, 10);
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
