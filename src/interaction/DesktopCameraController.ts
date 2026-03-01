import * as THREE from "three";

import {
  CABIN_DEPTH,
  CABIN_FLOOR_Y,
  CABIN_WALL_THICK,
  CABIN_WIDTH,
  SA_CAR_DEPTH,
  SA_CAR_START_Z,
} from "../utils/constants";

import type { EventBus } from "../core/EventBus";
import type { Updatable } from "../core/GameLoop";

type CameraMode = "standing" | "sitting" | "lying";

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
  private readonly maxZ = SA_CAR_START_Z + SA_CAR_DEPTH - 0.3;
  private readonly standingEyeY = CABIN_FLOOR_Y + 1.6;

  // Back wall boundary: player cannot walk through the door between cabin and SA car
  private readonly cabinBackWallZ = CABIN_DEPTH / 2 - 0.35; // cabin side limit
  private readonly saCarFrontWallZ = SA_CAR_START_Z + 0.35; // SA car side limit
  // Dead zone between cabin and SA car (the wall/gap area)
  private readonly wallZoneMin = CABIN_DEPTH / 2 - 0.35;
  private readonly wallZoneMax = SA_CAR_START_Z + 0.35;

  private readonly moveSpeed = 3.0;
  private readonly lookSensitivity = 0.002;

  // Jump state
  private velocityY = 0;
  private isGrounded = true;
  private readonly jumpForce = 4.0;
  private readonly gravity = -25.0;

  private mode: CameraMode = "standing";
  private targetPos = new THREE.Vector3(0, this.standingEyeY, -1.0);
  private targetYaw = 0;
  private targetPitch = 0;

  // Cached objects to avoid per-frame allocations
  private readonly _euler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _move = new THREE.Vector3();

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
    this.bedPos = new THREE.Vector3(
      halfW - wt - 0.39,
      CABIN_FLOOR_Y + 0.7,
      0.5,
    );

    this.camera.position.set(0, this.standingEyeY, -1.0);
    this.pitch = 0;
    this.yaw = 0;

    const canvas = this.renderer.domElement;
    canvas.addEventListener("click", () => {
      if (!this.enabled) return;
      if (this.renderer.xr.isPresenting) return;
      canvas.requestPointerLock();
    });

    document.addEventListener("pointerlockchange", () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isPointerLocked || !this.enabled) return;
      this.yaw -= e.movementX * this.lookSensitivity;
      this.pitch -= e.movementY * this.lookSensitivity;
      const maxPitch = this.mode === "lying" ? Math.PI / 2.5 : Math.PI / 3;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
    });

    document.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
    });
    document.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
    });

    // Listen for interaction events
    if (eventBus) {
      eventBus.on("interaction:sit", ({ active }) => {
        if (active) {
          this.mode = "sitting";
          this.targetPos.copy(this.seatPos);
          this.targetYaw = 0; // face windshield (-Z)
          this.targetPitch = 0;
        } else {
          this.mode = "standing";
        }
      });

      eventBus.on("interaction:lie", ({ active }) => {
        if (active) {
          this.mode = "lying";
          this.targetPos.copy(this.bedPos);
          this.targetYaw = 0;
          this.targetPitch = 0.3; // slightly looking up
        } else {
          this.mode = "standing";
        }
      });

      eventBus.on("interaction:teleport", ({ x, y, z }) => {
        this.camera.position.set(x, y, z);
        this.mode = "standing";
      });
    }
  }

  update(dt: number): void {
    if (this.renderer.xr.isPresenting) return;

    const lerpFactor = 1 - Math.exp(-6 * dt); // smooth camera transition

    if (this.mode === "sitting") {
      // Smoothly move to seat, allow looking around but no walking
      this.camera.position.lerp(this.seatPos, lerpFactor);
      this._euler.set(this.pitch, this.yaw, 0);
      this.camera.quaternion.setFromEuler(this._euler);
      return;
    }

    if (this.mode === "lying") {
      // Smoothly move to bed, camera tilted (lying on back)
      this.camera.position.lerp(this.bedPos, lerpFactor);
      this._euler.set(this.pitch, this.yaw, 0);
      this.camera.quaternion.setFromEuler(this._euler);
      return;
    }

    // Standing mode — normal movement
    this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this._right.set(-this._forward.z, 0, this._forward.x);

    const move = this._move.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp"))
      move.add(this._forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown"))
      move.sub(this._forward);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft"))
      move.sub(this._right);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight"))
      move.add(this._right);

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.moveSpeed * dt);
      const prevZ = this.camera.position.z;
      this.camera.position.add(move);
      this.camera.position.x = Math.max(
        this.minX,
        Math.min(this.maxX, this.camera.position.x),
      );
      this.camera.position.z = Math.max(
        this.minZ,
        Math.min(this.maxZ, this.camera.position.z),
      );

      // Block passage through the wall between cabin and SA car.
      // If player is in the "dead zone" between walls, push them back to
      // whichever side they came from.
      const newZ = this.camera.position.z;
      if (newZ > this.wallZoneMin && newZ < this.wallZoneMax) {
        // Determine which side the player was on
        if (prevZ <= this.wallZoneMin) {
          this.camera.position.z = this.wallZoneMin;
        } else if (prevZ >= this.wallZoneMax) {
          this.camera.position.z = this.wallZoneMax;
        } else {
          // Already stuck in dead zone (shouldn't happen), push to cabin
          this.camera.position.z = this.wallZoneMin;
        }
      }
    }

    // Jump
    if (this.keys.has("Space") && this.isGrounded) {
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

    this._euler.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this._euler);
  }
}
