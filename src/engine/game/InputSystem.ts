import * as THREE from 'three';

export class InputSystem {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dropPlane: THREE.Mesh;
  private camera: THREE.Camera;
  private active: boolean = true;
  private _lastTouchTime: number = 0;

  private onMouseMoveCb: (pos: THREE.Vector3) => void;
  private onDropCb: () => void;
  private onRotateCb: () => void;

  /** Called with true on touchstart, false on touchend/cancel. Only fires on touch devices. */
  onTouchChange: ((active: boolean) => void) | null = null;

  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

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
    const planeGeo = new THREE.PlaneGeometry(200, 200);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    this.dropPlane = new THREE.Mesh(planeGeo, planeMat);
    this.dropPlane.position.set(0, 0, 0);
    scene.add(this.dropPlane);

    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('click', this._onClick);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('touchstart', this._onTouchStart, { passive: false });
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('touchcancel', this._onTouchCancel);
  }

  private _raycastTouch(touch: Touch): THREE.Vector3 | null {
    this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.dropPlane);
    if (hits.length > 0) {
      const point = hits[0].point.clone();
      point.z = 0;
      return point;
    }
    return null;
  }

  private _isUITarget(e: TouchEvent): boolean {
    return e.target instanceof HTMLElement && e.target.closest('button, a, input, [data-ui]') !== null;
  }

  private _onTouchStart = (e: TouchEvent): void => {
    if (!this.active) return;
    if (this._isUITarget(e)) return;
    e.preventDefault();
    const pos = this._raycastTouch(e.changedTouches[0]);
    if (pos) this.onMouseMoveCb(pos);
    this.onTouchChange?.(true);
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (!this.active) return;
    if (this._isUITarget(e)) return;
    e.preventDefault();
    const pos = this._raycastTouch(e.changedTouches[0]);
    if (pos) this.onMouseMoveCb(pos);
  };

  private _onTouchEnd = (e: TouchEvent): void => {
    if (!this.active) return;
    if (this._isUITarget(e)) return;
    // Ignore multi-touch lifts (only drop when last finger lifts)
    if (e.touches.length > 0) return;
    this._lastTouchTime = performance.now();
    this.onDropCb();
    this.onTouchChange?.(false);
  };

  private _onTouchCancel = (): void => {
    this.onTouchChange?.(false);
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (!this.active) return;
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.dropPlane);
    if (hits.length > 0) {
      const point = hits[0].point.clone();
      point.z = 0;
      this.onMouseMoveCb(point);
    }
  };

  private _onClick = (e: MouseEvent): void => {
    if (!this.active) return;
    // Suppress the synthetic click that fires after touchend
    if (performance.now() - this._lastTouchTime < 500) return;
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

  setDropPlaneHeight(y: number): void {
    this.dropPlane.position.y = y;
  }

  dispose(): void {
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('click', this._onClick);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('touchstart', this._onTouchStart);
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchCancel);
  }
}
