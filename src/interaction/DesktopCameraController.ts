import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import {
  CABIN_WIDTH, CABIN_DEPTH, CABIN_FLOOR_Y, CABIN_HEIGHT,
} from '../utils/constants';

/**
 * Non-VR desktop camera controller.
 * - Mouse drag (or pointer lock) to look around
 * - W/S to move forward/backward within cabin bounds
 * - A/D to strafe left/right within cabin bounds
 */
export class DesktopCameraController implements Updatable {
  private yaw = 0;          // horizontal rotation (radians)
  private pitch = 0;        // vertical rotation (radians)
  private keys = new Set<string>();
  private isPointerLocked = false;
  private enabled = true;

  // Cabin bounds (with padding)
  private readonly minX = -(CABIN_WIDTH / 2 - 0.3);
  private readonly maxX = CABIN_WIDTH / 2 - 0.3;
  private readonly minZ = -(CABIN_DEPTH / 2 - 0.3);
  private readonly maxZ = CABIN_DEPTH / 2 - 0.3;
  private readonly eyeY = CABIN_FLOOR_Y + 1.6; // standing eye height

  private readonly moveSpeed = 1.5; // m/s
  private readonly lookSensitivity = 0.002;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer,
  ) {
    // Initial camera setup
    this.camera.position.set(0, this.eyeY, -1.0);
    this.pitch = 0;
    this.yaw = 0; // face -Z (toward windshield)

    // Pointer lock on canvas click
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (!this.enabled) return;
      if (this.renderer.xr.isPresenting) return;
      canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    // Mouse movement
    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || !this.enabled) return;
      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch -= e.movementY * this.lookSensitivity;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  update(dt: number): void {
    // Disable when in VR
    if (this.renderer.xr.isPresenting) return;

    // Movement direction relative to yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.moveSpeed * dt);
      this.camera.position.add(move);

      // Clamp to cabin bounds
      this.camera.position.x = Math.max(this.minX, Math.min(this.maxX, this.camera.position.x));
      this.camera.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.camera.position.z));
    }

    // Keep eye height constant
    this.camera.position.y = this.eyeY;

    // Apply look rotation
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}
