import * as THREE from 'three';

export class InputSystem {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dropPlane: THREE.Mesh;
  private camera: THREE.Camera;
  private active: boolean = true;

  private onMouseMoveCb: (pos: THREE.Vector3) => void;
  private onDropCb: () => void;
  private onRotateCb: () => void;

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    onMouseMove: (pos: THREE.Vector3) => void,
    onDrop: () => void,
    onRotate: () => void
  ) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.onMouseMoveCb = onMouseMove;
    this.onDropCb = onDrop;
    this.onRotateCb = onRotate;

    // Invisible vertical plane at z=0 for drop-position raycasting
    // Make it large to accommodate high towers and zoomed out camera
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    this.dropPlane = new THREE.Mesh(planeGeo, planeMat);
    // No rotation - plane is vertical, perpendicular to Z-axis
    this.dropPlane.position.set(0, 0, 0);
    scene.add(this.dropPlane);

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('click', this._onClick);
    window.addEventListener('keydown', this._onKeyDown);
  }

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this.active) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.dropPlane);
    if (hits.length > 0) {
      const point = hits[0].point.clone();
      point.z = 0; // Force z to 0 for 2D movement
      this.onMouseMoveCb(point);
    }
  };

  private _onClick = (e: MouseEvent): void => {
    if (!this.active) return;
    // Ignore clicks that originated on interactive UI elements (buttons, etc.)
    if (e.target instanceof HTMLElement && e.target.closest('button, a, input, [data-ui]')) return;
    this.onDropCb();
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (!this.active) return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'ArrowUp') {
      this.onRotateCb();
    }
    if (e.key === ' ') {
      e.preventDefault();
      this.onDropCb();
    }
  };

  setActive(active: boolean): void {
    this.active = active;
  }
// Vertical plane doesn't need height adjustment - always at z=0
    // This method can be kept for future use or removed
  setDropPlaneHeight(y: number): void {
    this.dropPlane.position.y = y;
  }

  dispose(): void {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('keydown', this._onKeyDown);
  }
}
