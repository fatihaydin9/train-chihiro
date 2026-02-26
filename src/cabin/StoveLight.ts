import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { CABIN_FLOOR_Y, CABIN_DEPTH, CABIN_WIDTH, CABIN_WALL_THICK } from '../utils/constants';

type HeadlightMode = 'off' | 'short' | 'long';
const HEADLIGHT_MODES: HeadlightMode[] = ['off', 'short', 'long'];

export class StoveLight implements Updatable {
  // Headlights
  private headlightMode: HeadlightMode = 'off';
  private headlightL: THREE.SpotLight;
  private headlightR: THREE.SpotLight;

  // Lantern (nightstand lamp)
  private lantern: THREE.PointLight;
  private lanternOn = false;
  private lanternBase = 1.0;

  // Stove fire
  private stoveLight: THREE.PointLight;
  private stoveOn = false;
  private stoveFlames: THREE.Mesh[] = [];
  private flameMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, eventBus?: EventBus) {
    const halfD = CABIN_DEPTH / 2;
    const halfW = CABIN_WIDTH / 2;
    const wt = CABIN_WALL_THICK;

    // --- Headlights (two spotlights at front of train) ---
    this.headlightL = new THREE.SpotLight(0xFFEECC, 15, 50, Math.PI / 4, 0.3, 0.5);
    this.headlightL.position.set(-0.55, CABIN_FLOOR_Y + 0.3, -halfD - 0.1);
    this.headlightL.target.position.set(-0.55, CABIN_FLOOR_Y - 0.5, -halfD - 30);
    scene.add(this.headlightL);
    scene.add(this.headlightL.target);

    this.headlightR = new THREE.SpotLight(0xFFEECC, 15, 50, Math.PI / 4, 0.3, 0.5);
    this.headlightR.position.set(0.55, CABIN_FLOOR_Y + 0.3, -halfD - 0.1);
    this.headlightR.target.position.set(0.55, CABIN_FLOOR_Y - 0.5, -halfD - 30);
    scene.add(this.headlightR);
    scene.add(this.headlightR.target);

    this.applyHeadlightMode();

    // --- Lantern (nightstand by bed) ---
    const bedX = halfW - wt - 0.39;
    const bedW = 0.78;
    const nsX = bedX - bedW / 2 - 0.2;
    const nsZ = 0.3 + 0.15; // bedZ1 + 0.15
    const nsH = 0.4;
    const nsY = CABIN_FLOOR_Y + wt / 2 + nsH / 2;
    const lanternBaseY = nsY + nsH / 2;

    this.lantern = new THREE.PointLight(0xFFCC66, 0, 3, 2);
    this.lantern.position.set(nsX, lanternBaseY + 0.08, nsZ);
    scene.add(this.lantern);

    // --- Stove fire (kitchen area, left wall) ---
    const kitchenX = -halfW + wt / 2 + 0.275;
    const kitZ1 = 0.2;
    const stoveZ = kitZ1 + 0.4;
    const cabinetH = 0.7;
    const counterH = 0.04;
    const stoveH = 0.03;
    const stoveTopY = CABIN_FLOOR_Y + wt / 2 + cabinetH + counterH + stoveH;

    // Warm point light above stove
    this.stoveLight = new THREE.PointLight(0xFF6622, 0, 2.5, 2);
    this.stoveLight.position.set(kitchenX, stoveTopY + 0.15, stoveZ);
    scene.add(this.stoveLight);

    // Small flame meshes (cones) on each burner
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0xFF6622, transparent: true, opacity: 0 });
    for (let i = 0; i < 2; i++) {
      const bz = stoveZ - 0.07 + i * 0.14;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.03, 0.08, 6),
        this.flameMat,
      );
      flame.position.set(kitchenX, stoveTopY + 0.04, bz);
      flame.visible = false;
      scene.add(flame);
      this.stoveFlames.push(flame);
    }

    if (eventBus) {
      // Toggle stove
      eventBus.on('interaction:stove-toggle', () => {
        this.stoveOn = !this.stoveOn;
        for (const f of this.stoveFlames) f.visible = this.stoveOn;
        this.flameMat.opacity = this.stoveOn ? 0.9 : 0;
        this.stoveLight.intensity = this.stoveOn ? 0.8 : 0;
      });

      // Cycle headlights: off → short → long → off
      eventBus.on('interaction:light-toggle', () => {
        const idx = HEADLIGHT_MODES.indexOf(this.headlightMode);
        this.headlightMode = HEADLIGHT_MODES[(idx + 1) % HEADLIGHT_MODES.length];
        this.applyHeadlightMode();
      });

      // Toggle lantern
      eventBus.on('interaction:lantern-toggle', () => {
        this.lanternOn = !this.lanternOn;
        this.lantern.intensity = this.lanternOn ? this.lanternBase : 0;
      });
    }
  }

  private applyHeadlightMode(): void {
    switch (this.headlightMode) {
      case 'off':
        this.headlightL.intensity = 0;
        this.headlightR.intensity = 0;
        break;
      case 'short':
        this.headlightL.intensity = 4;
        this.headlightR.intensity = 4;
        this.headlightL.distance = 35;
        this.headlightR.distance = 35;
        this.headlightL.angle = Math.PI / 5;
        this.headlightR.angle = Math.PI / 5;
        this.headlightL.decay = 0.5;
        this.headlightR.decay = 0.5;
        break;
      case 'long':
        this.headlightL.intensity = 5.5;
        this.headlightR.intensity = 5.5;
        this.headlightL.distance = 80;
        this.headlightR.distance = 80;
        this.headlightL.angle = Math.PI / 3.5;
        this.headlightR.angle = Math.PI / 3.5;
        this.headlightL.decay = 0.3;
        this.headlightR.decay = 0.3;
        break;
    }
  }

  getHeadlightMode(): HeadlightMode {
    return this.headlightMode;
  }

  update(_dt: number, elapsed: number): void {
    // Gentle warm flicker on lantern
    if (this.lanternOn) {
      const flicker =
        Math.sin(elapsed * 6.0) * 0.06 +
        Math.sin(elapsed * 11.0) * 0.03 +
        Math.sin(elapsed * 19.0) * 0.02;
      this.lantern.intensity = this.lanternBase + flicker;
    }

    // Stove fire flicker
    if (this.stoveOn) {
      const fireFlicker =
        Math.sin(elapsed * 8.0) * 0.12 +
        Math.sin(elapsed * 14.0) * 0.06 +
        Math.sin(elapsed * 23.0) * 0.04;
      this.stoveLight.intensity = 0.8 + fireFlicker;

      // Animate flame scale for dancing effect
      for (let i = 0; i < this.stoveFlames.length; i++) {
        const f = this.stoveFlames[i];
        const phase = i * 1.5;
        const sy = 0.8 + Math.sin(elapsed * 10.0 + phase) * 0.3;
        const sx = 0.9 + Math.sin(elapsed * 7.0 + phase) * 0.15;
        f.scale.set(sx, sy, sx);
      }

      // Color shift between orange and yellow
      const t = Math.sin(elapsed * 5.0) * 0.5 + 0.5;
      const r = 1.0;
      const g = 0.3 + t * 0.25;
      const b = 0.05 + t * 0.08;
      this.flameMat.color.setRGB(r, g, b);
      this.stoveLight.color.setRGB(r, g * 0.8, b);
    }
  }
}
