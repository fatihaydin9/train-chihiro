import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import {
  CABIN_WIDTH, CABIN_DEPTH, CABIN_FLOOR_Y, CABIN_WALL_THICK,
} from '../utils/constants';

type CameraMode = 'standing' | 'sitting' | 'lying';

/**
 * Non-VR desktop camera controller.
 * - Mouse drag (or pointer lock) to look around
 * - W/S to move forward/backward within cabin bounds
 * - A/D to strafe left/right within cabin bounds
 * Supports sit/lie camera states via EventBus.
 */
export class DesktopCameraController implements Updatable {
  private yaw = 0;
  private pitch = 0;
  private keys = new Set<string>();
  private isPointerLocked = false;
  private enabled = true;

  private readonly minX = -(CABIN_WIDTH / 2 - 0.3);
  private readonly maxX = CABIN_WIDTH / 2 - 0.3;
  private readonly minZ = -(CABIN_DEPTH / 2 - 0.3);
  private readonly maxZ = CABIN_DEPTH / 2 - 0.3;
  private readonly standingEyeY = CABIN_FLOOR_Y + 1.6;

  private readonly moveSpeed = 3.0;
  private readonly lookSensitivity = 0.002;

  // Jump state
  private velocityY = 0;
  private isGrounded = true;
  private readonly jumpForce = 4.0;
  private readonly gravity = -25.0;

  private mode: CameraMode = 'standing';
  private targetPos = new THREE.Vector3(0, this.standingEyeY, -1.0);
  private targetYaw = 0;
  private targetPitch = 0;

  // Seat position (matches CabinSetup chair)
  private readonly seatPos: THREE.Vector3;
  // Bed position (matches CabinSetup bed)
  private readonly bedPos: THREE.Vector3;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private renderer: THREE.WebGLRenderer,
    eventBus?: EventBus,
  ) {
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;
    const wt = CABIN_WALL_THICK;
    const deskDepth = 0.7;
    const deskZ = -halfD + deskDepth / 2 + 0.02;

    this.seatPos = new THREE.Vector3(0, CABIN_FLOOR_Y + 1.1, deskZ + 0.6);
    this.bedPos = new THREE.Vector3(halfW - wt - 0.39, CABIN_FLOOR_Y + 0.7, 0.5);

    this.camera.position.set(0, this.standingEyeY, -1.0);
    this.pitch = 0;
    this.yaw = 0;

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (!this.enabled) return;
      if (this.renderer.xr.isPresenting) return;
      canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || !this.enabled) return;
      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch -= e.movementY * this.lookSensitivity;
      const maxPitch = this.mode === 'lying' ? Math.PI / 2.5 : Math.PI / 3;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    document.addEventListener('keydown', (e) => { this.keys.add(e.code); });
    document.addEventListener('keyup', (e) => { this.keys.delete(e.code); });

    // Listen for interaction events
    if (eventBus) {
      eventBus.on('interaction:sit', ({ active }) => {
        if (active) {
          this.mode = 'sitting';
          this.targetPos.copy(this.seatPos);
          this.targetYaw = 0; // face windshield (-Z)
          this.targetPitch = 0;
        } else {
          this.mode = 'standing';
        }
      });

      eventBus.on('interaction:lie', ({ active }) => {
        if (active) {
          this.mode = 'lying';
          this.targetPos.copy(this.bedPos);
          this.targetYaw = 0;
          this.targetPitch = 0.3; // slightly looking up
        } else {
          this.mode = 'standing';
        }
      });
    }
  }

  update(dt: number): void {
    if (this.renderer.xr.isPresenting) return;

    const lerpFactor = 1 - Math.exp(-6 * dt); // smooth camera transition

    if (this.mode === 'sitting') {
      // Smoothly move to seat, allow looking around but no walking
      this.camera.position.lerp(this.seatPos, lerpFactor);
      const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
      return;
    }

    if (this.mode === 'lying') {
      // Smoothly move to bed, camera tilted (lying on back)
      this.camera.position.lerp(this.bedPos, lerpFactor);
      const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
      return;
    }

    // Standing mode — normal movement
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
      this.camera.position.x = Math.max(this.minX, Math.min(this.maxX, this.camera.position.x));
      this.camera.position.z = Math.max(this.minZ, Math.min(this.maxZ, this.camera.position.z));
    }

    // Jump
    if (this.keys.has('Space') && this.isGrounded) {
      this.velocityY = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.velocityY += this.gravity * dt;
      this.camera.position.y += this.velocityY * dt;

      if (this.camera.position.y <= this.standingEyeY) {
        this.camera.position.y = this.standingEyeY;
        this.velocityY = 0;
        this.isGrounded = true;
      }
    } else {
      this.camera.position.y = this.standingEyeY;
    }

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }
}
