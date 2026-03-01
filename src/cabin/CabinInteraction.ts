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

interface InteractionZone {
  id: string;
  label: string | (() => string);
  box: THREE.Box3;
  action: () => void;
  /** Only available when sitting in the driver seat */
  seatOnly?: boolean;
  /** Optional extra check — zone only active when this returns true */
  isInRange?: () => boolean;
}

/**
 * Handles cabin interactions: sit on chair, lie on bed, headlight modes,
 * lantern toggle, speed control (when seated).
 */
export class CabinInteraction implements Updatable {
  private zones: InteractionZone[] = [];
  private raycaster = new THREE.Raycaster();
  private readonly _dir = new THREE.Vector3();
  private tooltip: HTMLDivElement;
  private activeZone: InteractionZone | null = null;
  private isSitting = false;
  private isLying = false;
  private isFastSpeed = false;

  // Headlight mode label tracking
  private headlightModeIndex = 0; // starts off
  private static readonly HL_LABELS = ["Headlight: Off", "Headlight: Low", "Headlight: High"];

  constructor(
    private camera: THREE.PerspectiveCamera,
    private eventBus: EventBus,
  ) {
    const floorY = CABIN_FLOOR_Y;
    const wt = CABIN_WALL_THICK;
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;

    // Wall boundary Z — separates cabin from SA car
    const wallBoundaryZ = (halfD + SA_CAR_START_Z) / 2; // midpoint of gap
    const inCabin = () => this.camera.position.z < wallBoundaryZ;

    // Chair zone
    const deskDepth = 0.7;
    const deskZ = -halfD + deskDepth / 2 + 0.02;
    const seatZ = deskZ + 0.6;
    this.zones.push({
      id: "chair",
      label: "Sit [E]",
      box: new THREE.Box3(
        new THREE.Vector3(-0.35, floorY + 0.3, seatZ - 0.3),
        new THREE.Vector3(0.35, floorY + 0.9, seatZ + 0.5),
      ),
      action: () => this.toggleSit(),
      isInRange: inCabin,
    });

    // Bed zone
    const bedX = halfW - wt - 0.39;
    const bedZ1 = 0.3;
    const bedZ2 = 2.6;
    this.zones.push({
      id: "bed",
      label: "Lie Down [E]",
      box: new THREE.Box3(
        new THREE.Vector3(bedX - 0.5, floorY + 0.2, bedZ1 - 0.1),
        new THREE.Vector3(bedX + 0.5, floorY + 0.8, bedZ2 + 0.1),
      ),
      action: () => this.toggleLie(),
      isInRange: inCabin,
    });

    // Speed toggle — looking at left lever area (seat only)
    this.zones.push({
      id: "speed",
      label: () => (this.isFastSpeed ? "Slow Down [E]" : "Speed Up [E]"),
      box: new THREE.Box3(
        new THREE.Vector3(-0.65, floorY + 0.75, deskZ - 0.25),
        new THREE.Vector3(-0.25, floorY + 1.0, deskZ + 0.05),
      ),
      action: () => this.toggleSpeed(),
      seatOnly: true,
      isInRange: inCabin,
    });

    // Headlight control — right side button (seat only)
    this.zones.push({
      id: "headlight",
      label: () =>
        CabinInteraction.HL_LABELS[(this.headlightModeIndex + 1) % 3] + " [E]",
      box: new THREE.Box3(
        new THREE.Vector3(0.25, floorY + 0.75, deskZ - 0.25),
        new THREE.Vector3(0.65, floorY + 1.0, deskZ + 0.05),
      ),
      action: () => this.cycleHeadlight(),
      seatOnly: true,
      isInRange: inCabin,
    });

    // Lantern toggle (nightstand next to bed)
    const bedW = 0.78;
    const nsX = bedX - bedW / 2 - 0.2;
    const nsZ = bedZ1 + 0.15;
    this.zones.push({
      id: "lantern",
      label: "Lamp On/Off [E]",
      box: new THREE.Box3(
        new THREE.Vector3(nsX - 0.25, floorY + 0.2, nsZ - 0.25),
        new THREE.Vector3(nsX + 0.25, floorY + 0.9, nsZ + 0.25),
      ),
      action: () =>
        this.eventBus.emit("interaction:lantern-toggle", undefined as never),
      isInRange: inCabin,
    });

    // Stove toggle (kitchen area, left wall)
    const kitchenX = -halfW + CABIN_WALL_THICK / 2 + 0.275;
    const stoveZ = 0.2 + 0.4; // kitZ1 + 0.4
    this.zones.push({
      id: "stove",
      label: "Stove On/Off [E]",
      box: new THREE.Box3(
        new THREE.Vector3(kitchenX - 0.35, floorY + 0.5, stoveZ - 0.3),
        new THREE.Vector3(kitchenX + 0.35, floorY + 1.1, stoveZ + 0.3),
      ),
      action: () =>
        this.eventBus.emit("interaction:stove-toggle", undefined as never),
      isInRange: inCabin,
    });

    // Cabin back door — enter SA car (land just past the door)
    const saCarDoorInside = SA_CAR_START_Z + 1.0;
    this.zones.push({
      id: "sa-door-enter",
      label: "Enter Car [E]",
      box: new THREE.Box3(
        new THREE.Vector3(-0.6, floorY, halfD - 0.8),
        new THREE.Vector3(0.6, floorY + 2.5, halfD + 0.3),
      ),
      action: () =>
        this.eventBus.emit("interaction:teleport", {
          x: 0,
          y: CABIN_FLOOR_Y + 1.6,
          z: saCarDoorInside,
        }),
      /** Only show when player is on cabin side */
      isInRange: () => this.camera.position.z < wallBoundaryZ,
    });

    // SA car front door — return to cabin (land just inside cabin)
    const cabinDoorInside = halfD - 1.0;
    this.zones.push({
      id: "sa-door-return",
      label: "Return to Cabin [E]",
      box: new THREE.Box3(
        new THREE.Vector3(-0.6, floorY, SA_CAR_START_Z - 0.3),
        new THREE.Vector3(0.6, floorY + 2.5, SA_CAR_START_Z + 1.0),
      ),
      action: () =>
        this.eventBus.emit("interaction:teleport", {
          x: 0,
          y: CABIN_FLOOR_Y + 1.6,
          z: cabinDoorInside,
        }),
      /** Only show when player is on SA car side */
      isInRange: () => this.camera.position.z > wallBoundaryZ,
    });

    // Create tooltip overlay
    this.tooltip = document.createElement("div");
    this.tooltip.style.cssText =
      "position:fixed;top:50%;left:50%;transform:translate(-50%,40px);" +
      "color:#fff;font-family:sans-serif;font-size:14px;font-weight:500;" +
      "background:rgba(0,0,0,0.55);padding:6px 14px;border-radius:6px;" +
      "pointer-events:none;opacity:0;transition:opacity 0.15s;z-index:100;" +
      "text-align:center;letter-spacing:0.3px;";
    document.body.appendChild(this.tooltip);

    // E key handler
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyE" && this.activeZone) {
        this.activeZone.action();
      }
      if (e.code === "Escape") {
        if (this.isSitting) this.toggleSit();
        if (this.isLying) this.toggleLie();
      }
    });
  }

  update(): void {
    this.raycaster.set(
      this.camera.position,
      this.camera.getWorldDirection(this._dir),
    );
    this.raycaster.far = 3;

    let found: InteractionZone | null = null;
    const ray = this.raycaster.ray;

    for (const zone of this.zones) {
      if (zone.seatOnly && !this.isSitting) continue;
      if (zone.isInRange && !zone.isInRange()) continue;
      if (ray.intersectsBox(zone.box)) {
        found = zone;
        break;
      }
    }

    // Resolve label (string or function)
    const getLabel = (z: InteractionZone): string =>
      typeof z.label === "function" ? z.label() : z.label;

    if (this.isSitting) {
      if (found && found.id !== "chair") {
        this.tooltip.textContent = getLabel(found);
        this.tooltip.style.opacity = "1";
        this.activeZone = found;
      } else {
        this.tooltip.style.opacity = "0";
        this.activeZone = this.zones.find((z) => z.id === "chair") ?? null;
      }
      return;
    }
    if (this.isLying) {
      this.tooltip.textContent = "Get Up [E / Esc]";
      this.tooltip.style.opacity = "1";
      this.activeZone = this.zones.find((z) => z.id === "bed") ?? null;
      return;
    }

    this.activeZone = found;
    if (found) {
      this.tooltip.textContent = getLabel(found);
      this.tooltip.style.opacity = "1";
    } else {
      this.tooltip.style.opacity = "0";
    }
  }

  private toggleSit(): void {
    this.isSitting = !this.isSitting;
    if (this.isLying) this.isLying = false;
    this.eventBus.emit("interaction:sit", { active: this.isSitting });
  }

  private toggleLie(): void {
    this.isLying = !this.isLying;
    if (this.isSitting) this.isSitting = false;
    this.eventBus.emit("interaction:lie", { active: this.isLying });
  }

  private cycleHeadlight(): void {
    this.headlightModeIndex = (this.headlightModeIndex + 1) % 3;
    this.eventBus.emit("interaction:light-toggle", undefined as never);
  }

  private toggleSpeed(): void {
    this.isFastSpeed = !this.isFastSpeed;
    this.eventBus.emit("train:speed-changed", { fast: this.isFastSpeed });
  }
}
