import * as THREE from 'three';

const INIT_CAM_Y = 12;
const INIT_CAM_Z = 14;
const MAX_CAM_Y = 22;
const MAX_CAM_Z = 28;

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  private targetY: number = INIT_CAM_Y;
  private targetZ: number = INIT_CAM_Z;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 60);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, INIT_CAM_Y, INIT_CAM_Z);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(8, 16, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-6, 4, -6);
    this.scene.add(fillLight);
  }

  /** Nudge the camera target outward by dz (back) and dy (up). */
  nudgeOut(dz: number, dy: number): void {
    this.targetZ = Math.min(this.targetZ + dz, MAX_CAM_Z);
    this.targetY = Math.min(this.targetY + dy, MAX_CAM_Y);
  }

  resetCamera(): void {
    this.targetZ = INIT_CAM_Z;
    this.targetY = INIT_CAM_Y;
    this.camera.position.set(0, INIT_CAM_Y, INIT_CAM_Z);
  }

  /** Call each frame — eases camera toward target. */
  updateCamera(dt: number): void {
    // Frame-rate-independent lerp: ~90% of the way in 0.25 s
    const alpha = 1 - Math.pow(0.01, dt * 4);
    this.camera.position.z += (this.targetZ - this.camera.position.z) * alpha;
    this.camera.position.y += (this.targetY - this.camera.position.y) * alpha;
    this.camera.lookAt(0, 3, 0);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
