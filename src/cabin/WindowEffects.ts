import * as THREE from "three";

import {
  CABIN_DEPTH,
  CABIN_FLOOR_Y,
  CABIN_HEIGHT,
  CABIN_WALL_THICK,
  CABIN_WIDTH,
} from "../utils/constants";

import type { EventBus } from "../core/EventBus";
import type { Updatable } from "../core/GameLoop";
import type { WeatherType } from "../biome/types";

// Frost only in ice biomes (polar, arctic_coast, frozen_waste)
const ICE_BIOMES = new Set(["polar", "arctic_coast", "frozen_waste"]);

// How much corner-only condensation each weather type produces (0–1)
const CONDENSATION_LEVEL: Partial<Record<WeatherType, number>> = {
  rain: 0.3,
  storm: 0.5,
  drizzle: 0.15,
};

// How much rain each weather type produces (0–1)
const RAIN_LEVEL: Partial<Record<WeatherType, number>> = {
  rain: 0.8,
  storm: 1.0,
  drizzle: 0.4,
  hail: 0.3,
};

/** A raindrop that hits the glass and slowly drips down. */
interface RainDrop {
  x: number;
  y: number;
  startY: number;
  speed: number;
  headSize: number;
  trail: Array<{ x: number; y: number }>;
  age: number;
  maxAge: number;
  wobble: number;
  drift: number;
}

/** A brief splash burst when a drop first hits the glass. */
interface Splash {
  x: number;
  y: number;
  age: number; // seconds since impact
  maxAge: number; // fade-out duration (~0.3s)
  size: number; // burst radius
}

/**
 * Window frost/fog and rain-drop effects rendered as animated canvas textures
 * on overlay planes placed just inside each cabin window.
 */
export class WindowEffects implements Updatable {
  private frostOverlays: THREE.Mesh[] = [];
  private rainOverlays: THREE.Mesh[] = [];

  private frostCanvas: HTMLCanvasElement;
  private frostTex: THREE.CanvasTexture;
  private frostMat: THREE.MeshBasicMaterial;

  // Each window gets its own rain canvas/texture/material for independent drops
  private rainPanels: Array<{
    canvas: HTMLCanvasElement;
    tex: THREE.CanvasTexture;
    mat: THREE.MeshBasicMaterial;
    drops: RainDrop[];
    splashes: Splash[];
    spawnAccum: number;
  }> = [];

  private condensationOverlays: THREE.Mesh[] = [];
  private condensationCanvas: HTMLCanvasElement;
  private condensationTex: THREE.CanvasTexture;
  private condensationMat: THREE.MeshBasicMaterial;

  private targetFrost = 0;
  private currentFrost = 0;
  private targetRain = 0;
  private currentRain = 0;
  private targetCondensation = 0;
  private currentCondensation = 0;
  private currentBiomeName = "";
  private stoveOn = false;

  constructor(
    private scene: THREE.Scene,
    eventBus: EventBus,
  ) {
    const halfW = CABIN_WIDTH / 2;
    const wt = CABIN_WALL_THICK;
    const floorY = CABIN_FLOOR_Y;

    // Window geometry (matches CabinSetup.buildSideWall)
    const winPadBottom = 0.7;
    const winPadTop = 0.4;
    const winPadSide = 0.25;
    const winH = CABIN_HEIGHT - winPadBottom - winPadTop;
    const winW = CABIN_DEPTH - winPadSide * 2;
    const winCenterY = floorY + winPadBottom + winH / 2;

    // --- Frost texture (512×256, high-res for fine detail) ---
    this.frostCanvas = document.createElement("canvas");
    this.frostCanvas.width = 512;
    this.frostCanvas.height = 256;
    this.frostTex = new THREE.CanvasTexture(this.frostCanvas);
    this.frostTex.wrapS = THREE.ClampToEdgeWrapping;
    this.frostTex.wrapT = THREE.ClampToEdgeWrapping;
    this.drawFrostPattern();

    this.frostMat = new THREE.MeshBasicMaterial({
      map: this.frostTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // --- Condensation texture (corner-only fog for rain) ---
    this.condensationCanvas = document.createElement("canvas");
    this.condensationCanvas.width = 512;
    this.condensationCanvas.height = 256;
    this.condensationTex = new THREE.CanvasTexture(this.condensationCanvas);
    this.drawCondensationPattern();
    this.condensationMat = new THREE.MeshBasicMaterial({
      map: this.condensationTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Create overlay planes for left and right side windows
    for (const side of [-1, 1]) {
      const xPos = side * halfW;
      const inset = side * (wt / 2 + 0.02);

      const frostGeo = new THREE.PlaneGeometry(winW - 0.1, winH - 0.1);
      const frostMesh = new THREE.Mesh(frostGeo, this.frostMat);
      frostMesh.rotation.y = Math.PI / 2;
      frostMesh.position.set(xPos - inset, winCenterY, 0);
      scene.add(frostMesh);
      this.frostOverlays.push(frostMesh);

      const condGeo = new THREE.PlaneGeometry(winW - 0.1, winH - 0.1);
      const condMesh = new THREE.Mesh(condGeo, this.condensationMat);
      condMesh.rotation.y = Math.PI / 2;
      condMesh.position.set(xPos - inset, winCenterY, 0);
      scene.add(condMesh);
      this.condensationOverlays.push(condMesh);

      // Rain — individual panel per window
      const panel = this.createRainPanel();
      const rainGeo = new THREE.PlaneGeometry(winW - 0.1, winH - 0.1);
      const rainMesh = new THREE.Mesh(rainGeo, panel.mat);
      rainMesh.rotation.y = Math.PI / 2;
      rainMesh.position.set(xPos - inset, winCenterY, 0);
      scene.add(rainMesh);
      this.rainOverlays.push(rainMesh);
    }

    // --- Front windshield overlays ---
    const frontZ = -CABIN_DEPTH / 2;
    const fwSillH = 0.55;
    const fwHeaderH = 0.25;
    const fwPillarW = 0.15;
    const fwWinH = CABIN_HEIGHT - fwSillH - fwHeaderH;
    const fwWinW = CABIN_WIDTH - fwPillarW * 2;
    const fwCenterY = floorY + fwSillH + fwWinH / 2;
    const fwInset = wt / 2 + 0.02;

    const fwFrostGeo = new THREE.PlaneGeometry(fwWinW - 0.1, fwWinH - 0.1);
    const fwFrostMesh = new THREE.Mesh(fwFrostGeo, this.frostMat);
    fwFrostMesh.position.set(0, fwCenterY, frontZ + fwInset);
    scene.add(fwFrostMesh);
    this.frostOverlays.push(fwFrostMesh);

    const fwCondGeo = new THREE.PlaneGeometry(fwWinW - 0.1, fwWinH - 0.1);
    const fwCondMesh = new THREE.Mesh(fwCondGeo, this.condensationMat);
    fwCondMesh.position.set(0, fwCenterY, frontZ + fwInset);
    scene.add(fwCondMesh);
    this.condensationOverlays.push(fwCondMesh);

    // Rain — front windshield panel
    const fwPanel = this.createRainPanel();
    const fwRainGeo = new THREE.PlaneGeometry(fwWinW - 0.1, fwWinH - 0.1);
    const fwRainMesh = new THREE.Mesh(fwRainGeo, fwPanel.mat);
    fwRainMesh.position.set(0, fwCenterY, frontZ + fwInset);
    scene.add(fwRainMesh);
    this.rainOverlays.push(fwRainMesh);

    // Listen to biome transitions
    eventBus.on("biome:transition-tick", (config) => {
      const wType = config.weatherType;
      const intensity = config.weatherIntensity;
      this.currentBiomeName = config.name;

      // Frost ONLY in ice biomes — pulses gently
      if (ICE_BIOMES.has(config.name)) {
        const pulse = 0.4 + 0.6 * (Math.sin(this.elapsed * 0.25) * 0.5 + 0.5);
        this.targetFrost = intensity * 0.7 * pulse;
      } else {
        this.targetFrost = 0;
      }

      this.targetRain = (RAIN_LEVEL[wType] ?? 0) * intensity;
      this.targetCondensation = (CONDENSATION_LEVEL[wType] ?? 0) * intensity;
    });

    // Stove warmth clears condensation and frost
    eventBus.on("stove:state", (data) => {
      this.stoveOn = data.on;
    });
  }

  private createRainPanel() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const panel = {
      canvas,
      tex,
      mat,
      drops: [] as RainDrop[],
      splashes: [] as Splash[],
      spawnAccum: 0,
    };
    this.rainPanels.push(panel);
    return panel;
  }

  private elapsed = 0;
  private rainDrawAccum = 0;
  private static readonly RAIN_DRAW_INTERVAL = 1 / 15; // throttle canvas redraws to ~15fps

  update(dt: number, _elapsed: number): void {
    this.elapsed += dt;
    this.rainDrawAccum += dt;

    // Faster lerp when decreasing (clearing), slower when building up
    const frostSpeed = (this.targetFrost < this.currentFrost ? 3.0 : 0.8) * dt;
    const condSpeed =
      (this.targetCondensation < this.currentCondensation ? 3.0 : 0.8) * dt;
    const rainSpeed = 0.8 * dt;

    // Stove warmth suppresses frost and condensation
    const effectiveFrost = this.stoveOn
      ? this.targetFrost * 0.1
      : this.targetFrost;
    const effectiveCond = this.stoveOn
      ? this.targetCondensation * 0.1
      : this.targetCondensation;

    this.currentFrost += (effectiveFrost - this.currentFrost) * frostSpeed;
    this.currentRain += (this.targetRain - this.currentRain) * rainSpeed;
    this.currentCondensation +=
      (effectiveCond - this.currentCondensation) * condSpeed;

    // Snap to zero when very close (prevent lingering)
    if (effectiveFrost < 0.01 && this.currentFrost < 0.03)
      this.currentFrost = 0;
    if (effectiveCond < 0.01 && this.currentCondensation < 0.03)
      this.currentCondensation = 0;

    // Frost (full window ice)
    if (this.currentFrost > 0.01) {
      this.frostMat.opacity = this.currentFrost;
      this.frostMat.visible = true;
    } else {
      this.frostMat.visible = false;
    }

    // Corner condensation (rain/snow fog)
    if (this.currentCondensation > 0.01) {
      this.condensationMat.opacity = this.currentCondensation;
      this.condensationMat.visible = true;
    } else {
      this.condensationMat.visible = false;
    }

    // Rain drops + splashes — per panel
    const shouldRedraw = this.rainDrawAccum >= WindowEffects.RAIN_DRAW_INTERVAL;
    if (shouldRedraw) this.rainDrawAccum = 0;

    for (const panel of this.rainPanels) {
      if (this.currentRain > 0.01) {
        panel.mat.opacity = Math.min(this.currentRain, 0.85);
        panel.mat.visible = true;
        this.spawnNewDrops(dt, panel);
        this.updateDrops(dt, panel);
        this.updateSplashes(dt, panel);
        if (shouldRedraw) {
          this.drawDrops(panel);
          panel.tex.needsUpdate = true;
        }
      } else {
        panel.mat.visible = false;
        if (panel.drops.length > 0) panel.drops.length = 0;
        if (panel.splashes.length > 0) panel.splashes.length = 0;
      }
    }
  }

  // ===== FROST (static, drawn once) =====

  private drawFrostPattern(): void {
    const w = this.frostCanvas.width;
    const h = this.frostCanvas.height;
    const ctx = this.frostCanvas.getContext("2d")!;

    ctx.clearRect(0, 0, w, h);

    // Edge gradient
    const grad = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.1,
      w / 2,
      h / 2,
      Math.min(w, h) * 0.55,
    );
    grad.addColorStop(0, "rgba(220,235,255,0)");
    grad.addColorStop(0.45, "rgba(220,235,255,0.05)");
    grad.addColorStop(0.7, "rgba(210,225,250,0.3)");
    grad.addColorStop(1, "rgba(200,220,245,0.7)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Frost crystal dots near edges
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 0.4) continue;

      const alpha =
        Math.min(1, (dist - 0.3) * 1.2) * (0.3 + Math.random() * 0.5);
      const size = 0.5 + Math.random() * 2;
      ctx.fillStyle = `rgba(230,240,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frost feather lines from corners
    ctx.strokeStyle = "rgba(220,235,255,0.2)";
    ctx.lineWidth = 0.5;
    for (const [cx, cy] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      for (let j = 0; j < 15; j++) {
        const angle =
          Math.atan2(h / 2 - cy, w / 2 - cx) + (Math.random() - 0.5) * 1.2;
        const len = 30 + Math.random() * 60;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        let px = cx;
        let py = cy;
        for (let s = 0; s < 6; s++) {
          px += Math.cos(angle + (Math.random() - 0.5) * 0.4) * (len / 6);
          py += Math.sin(angle + (Math.random() - 0.5) * 0.4) * (len / 6);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    this.frostTex.needsUpdate = true;
  }

  // ===== CONDENSATION (static corner fog, drawn once) =====

  private drawCondensationPattern(): void {
    const w = this.condensationCanvas.width;
    const h = this.condensationCanvas.height;
    const ctx = this.condensationCanvas.getContext("2d")!;

    ctx.clearRect(0, 0, w, h);

    // Four corner gradients only — center stays clear
    for (const [cx, cy] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        Math.min(w, h) * 0.4,
      );
      grad.addColorStop(0, "rgba(200,215,235,0.5)");
      grad.addColorStop(0.4, "rgba(200,215,235,0.2)");
      grad.addColorStop(0.7, "rgba(200,215,235,0.05)");
      grad.addColorStop(1, "rgba(200,215,235,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Soft dots clustered near corners
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      // Only draw near corners
      const dx = Math.min(x, w - x) / (w / 2);
      const dy = Math.min(y, h - y) / (h / 2);
      const cornerDist = Math.max(dx, dy);
      if (cornerDist > 0.4) continue;
      const alpha = (1 - cornerDist / 0.4) * (0.1 + Math.random() * 0.2);
      const size = 1 + Math.random() * 3;
      ctx.fillStyle = `rgba(200,215,235,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.condensationTex.needsUpdate = true;
  }

  // ===== RAIN DROPS (animated, dripping) =====

  /** Pick X spread across the whole window with slight edge bias. */
  private edgeBiasedX(canvas: HTMLCanvasElement): number {
    const w = canvas.width;
    if (Math.random() < 0.4) {
      const edge = Math.random() < 0.5 ? 0 : 1;
      const margin = w * 0.3;
      return edge === 0 ? Math.random() * margin : w - Math.random() * margin;
    }
    return Math.random() * w;
  }

  /** Pick Y — drops start from the top and drip down. */
  private topBiasedY(canvas: HTMLCanvasElement): number {
    const h = canvas.height;
    return Math.random() * h * 0.15;
  }

  private createDrop(canvas: HTMLCanvasElement): RainDrop {
    const hitY = this.topBiasedY(canvas);
    const hitX = this.edgeBiasedX(canvas);
    return {
      x: hitX,
      y: hitY,
      startY: hitY,
      speed: 8 + Math.random() * 16,
      headSize: 0.6 + Math.random() * 0.6,
      trail: [{ x: hitX, y: hitY }],
      age: 0,
      maxAge: 3 + Math.random() * 5,
      wobble: Math.random() * 100,
      drift: (Math.random() - 0.5) * 0.3,
    };
  }

  private spawnNewDrops(dt: number, panel: (typeof this.rainPanels)[0]): void {
    const rate = 10 + this.currentRain * 20;
    panel.spawnAccum += rate * dt;
    while (panel.spawnAccum >= 1) {
      panel.spawnAccum -= 1;
      if (panel.drops.length < 160) {
        const drop = this.createDrop(panel.canvas);
        panel.drops.push(drop);
        if (Math.random() < 0.2) {
          panel.splashes.push({
            x: drop.x,
            y: drop.startY,
            age: 0,
            maxAge: 0.4 + Math.random() * 0.25,
            size: 3.0 + Math.random() * 4.0,
          });
        }
      }
    }
  }

  private updateSplashes(dt: number, panel: (typeof this.rainPanels)[0]): void {
    for (let i = panel.splashes.length - 1; i >= 0; i--) {
      panel.splashes[i].age += dt;
      if (panel.splashes[i].age > panel.splashes[i].maxAge) {
        panel.splashes.splice(i, 1);
      }
    }
  }

  private updateDrops(dt: number, panel: (typeof this.rainPanels)[0]): void {
    const h = panel.canvas.height;

    for (let i = panel.drops.length - 1; i >= 0; i--) {
      const d = panel.drops[i];
      d.age += dt;

      if (d.age > d.maxAge || d.y > h + 5) {
        panel.drops.splice(i, 1);
        continue;
      }

      const dy = d.speed * dt;
      d.y += dy;

      const wobbleX = Math.sin(d.age * 2.0 + d.wobble) * 0.1;
      d.x += dy * d.drift + wobbleX * dt * 2;

      const lastTrail = d.trail[d.trail.length - 1];
      if (d.y - lastTrail.y > 3) {
        d.trail.push({ x: d.x, y: d.y });
        if (d.trail.length > 50) d.trail.shift();
      }
    }
  }

  private drawDrops(panel: (typeof this.rainPanels)[0]): void {
    const w = panel.canvas.width;
    const h = panel.canvas.height;
    const ctx = panel.canvas.getContext("2d")!;

    ctx.clearRect(0, 0, w, h);

    // === Splashes (impact bursts) — bright white-blue on glass ===
    for (const s of panel.splashes) {
      const t = s.age / s.maxAge; // 0→1 over lifetime
      const expand = 0.15 + t * 0.85;
      const alpha = 1 - t * t; // starts at 1.0, fades smoothly
      const r = s.size * expand;

      // Bright white center flash — impact point
      const centerAlpha = Math.min(1, (1 - t) * 1.2);
      ctx.fillStyle = `rgba(240,250,255,${centerAlpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(1.0, r * 0.3), 0, Math.PI * 2);
      ctx.fill();

      // Primary expanding ring — bold
      ctx.beginPath();
      ctx.strokeStyle = `rgba(200,230,255,${alpha * 0.85})`;
      ctx.lineWidth = 0.8;
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Outer halo ring
      if (r > 1.5) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(180,215,245,${alpha * 0.4})`;
        ctx.lineWidth = 0.4;
        ctx.arc(s.x, s.y, r * 1.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radial splatter droplets — bright
      if (t < 0.65) {
        const dotAlpha = alpha * 0.8;
        const numDots = 6 + Math.floor(s.size);
        for (let i = 0; i < numDots; i++) {
          const angle = (i / numDots) * Math.PI * 2 + s.x * 0.1;
          const dist = r * (0.6 + t * 1.0);
          const dotSize = 0.4 + Math.random() * 0.5;
          ctx.fillStyle = `rgba(220,240,255,${dotAlpha})`;
          ctx.beginPath();
          ctx.arc(
            s.x + Math.cos(angle) * dist,
            s.y + Math.sin(angle) * dist,
            dotSize,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      }
    }

    // === Drops (dripping down) ===
    for (const d of panel.drops) {
      const ageFade =
        1 - Math.max(0, d.age - d.maxAge * 0.7) / (d.maxAge * 0.3);
      const baseAlpha = Math.min(1, ageFade) * 0.35;
      if (baseAlpha < 0.01) continue;

      // Visible wet trail — thin but noticeable
      if (d.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(160,200,245,${baseAlpha * 0.2})`;
        ctx.lineWidth = 0.4;
        const firstPt = d.trail[0];
        ctx.moveTo(firstPt.x, firstPt.y);
        for (let t = 1; t < d.trail.length; t++) {
          ctx.lineTo(d.trail[t].x, d.trail[t].y);
        }
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      // Drop head — small but visible moving dot
      ctx.fillStyle = `rgba(180,210,250,${baseAlpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.headSize * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
