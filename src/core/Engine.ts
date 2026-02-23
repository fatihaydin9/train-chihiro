import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly cameraRig: THREE.Group;

  constructor() {
    // Renderer — Quest-optimized with soft shadows for visual warmth
    this.renderer = new THREE.WebGLRenderer({ antialias: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    document.body.appendChild(this.renderer.domElement);

    // VR button
    const vrButton = VRButton.createButton(this.renderer);
    vrButton.id = 'vr-button';
    document.body.appendChild(vrButton);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );
    this.camera.position.set(0, 0.2, -1.0); // initial position, overridden by DesktopCameraController

    // Scene
    this.scene = new THREE.Scene();

    // Camera rig — parent camera to a group so TrainMotion moves rig, not camera.
    // WebXR headset tracking works relative to the rig.
    this.cameraRig = new THREE.Group();
    this.cameraRig.add(this.camera);
    this.scene.add(this.cameraRig);

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
