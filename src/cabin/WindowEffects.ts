import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import type { WeatherType } from '../biome/types';
import {
  CABIN_WIDTH, CABIN_HEIGHT, CABIN_DEPTH, CABIN_WALL_THICK, CABIN_FLOOR_Y,
} from '../utils/constants';

// How much frost each weather type produces (0–1)
const FROST_LEVEL: Partial<Record<WeatherType, number>> = {
  snow: 0.3,
  blizzard: 0.85,
  frost: 0.95,
  hail: 0.5,
};

// How much rain each weather type produces (0–1)
const RAIN_LEVEL: Partial<Record<WeatherType, number>> = {
  rain: 0.8,
  storm: 1.0,
  drizzle: 0.4,
  hail: 0.3,
};

/**
 * A single raindrop that hits the glass and slowly drips down,
 * leaving a thin wet trail behind it.
 */
interface RainDrop {
  x: number;         // horizontal position on canvas
  y: number;         // current head position (dripping down)
  startY: number;    // where it first hit the glass
  speed: number;     // drip speed (pixels/sec) — slow
  headSize: number;  // tiny bulge at the leading edge
  trail: Array<{ x: number; y: number }>; // wobbly trail points
  age: number;       // seconds alive
  maxAge: number;    // fade out after this
  wobble: number;    // horizontal wobble seed
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

  private rainCanvas: HTMLCanvasElement;
  private rainTex: THREE.CanvasTexture;
  private rainMat: THREE.MeshBasicMaterial;

  private targetFrost = 0;
  private currentFrost = 0;
  private targetRain = 0;
  private currentRain = 0;

  private rainDrops: RainDrop[] = [];
  private spawnAccum = 0;

  constructor(private scene: THREE.Scene, eventBus: EventBus) {
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
    this.frostCanvas = document.createElement('canvas');
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

    // --- Rain texture (512×256, animated dripping drops) ---
    this.rainCanvas = document.createElement('canvas');
    this.rainCanvas.width = 512;
    this.rainCanvas.height = 256;
    this.rainTex = new THREE.CanvasTexture(this.rainCanvas);
    this.rainMat = new THREE.MeshBasicMaterial({
      map: this.rainTex,
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

      const rainGeo = new THREE.PlaneGeometry(winW - 0.1, winH - 0.1);
      const rainMesh = new THREE.Mesh(rainGeo, this.rainMat);
      rainMesh.rotation.y = Math.PI / 2;
      rainMesh.position.set(xPos - inset, winCenterY, 0);
      scene.add(rainMesh);
      this.rainOverlays.push(rainMesh);
    }

    // Listen to biome transitions
    eventBus.on('biome:transition-tick', (config) => {
      const wType = config.weatherType;
      const intensity = config.weatherIntensity;
      this.targetFrost = (FROST_LEVEL[wType] ?? 0) * intensity;
      this.targetRain = (RAIN_LEVEL[wType] ?? 0) * intensity;
    });
  }

  update(dt: number, _elapsed: number): void {
    const lerpSpeed = 0.8 * dt;
    this.currentFrost += (this.targetFrost - this.currentFrost) * lerpSpeed;
    this.currentRain += (this.targetRain - this.currentRain) * lerpSpeed;

    // Frost
    if (this.currentFrost > 0.01) {
      this.frostMat.opacity = this.currentFrost;
      this.frostMat.visible = true;
    } else {
      this.frostMat.visible = false;
    }

    // Rain
    if (this.currentRain > 0.01) {
      this.rainMat.opacity = this.currentRain;
      this.rainMat.visible = true;
      this.spawnNewDrops(dt);
      this.updateDrops(dt);
      this.drawDrops();
      this.rainTex.needsUpdate = true;
    } else {
      this.rainMat.visible = false;
      // Clear drops when rain stops
      if (this.rainDrops.length > 0) this.rainDrops.length = 0;
    }
  }

  // ===== FROST (static, drawn once) =====

  private drawFrostPattern(): void {
    const w = this.frostCanvas.width;
    const h = this.frostCanvas.height;
    const ctx = this.frostCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, w, h);

    // Edge gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.min(w, h) * 0.55);
    grad.addColorStop(0, 'rgba(220,235,255,0)');
    grad.addColorStop(0.45, 'rgba(220,235,255,0.05)');
    grad.addColorStop(0.7, 'rgba(210,225,250,0.3)');
    grad.addColorStop(1, 'rgba(200,220,245,0.7)');
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

      const alpha = Math.min(1, (dist - 0.3) * 1.2) * (0.3 + Math.random() * 0.5);
      const size = 0.5 + Math.random() * 2;
      ctx.fillStyle = `rgba(230,240,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frost feather lines from corners
    ctx.strokeStyle = 'rgba(220,235,255,0.2)';
    ctx.lineWidth = 0.5;
    for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
      for (let j = 0; j < 15; j++) {
        const angle = Math.atan2(h / 2 - cy, w / 2 - cx) + (Math.random() - 0.5) * 1.2;
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

  // ===== RAIN DROPS (animated, dripping) =====

  private createDrop(): RainDrop {
    const w = this.rainCanvas.width;
    const h = this.rainCanvas.height;
    const hitY = Math.random() * h * 0.3; // hits in top 30%
    return {
      x: Math.random() * w,
      y: hitY,
      startY: hitY,
      speed: 8 + Math.random() * 18,      // slow drip: 8-26 px/s
      headSize: 1.0 + Math.random() * 1.5, // tiny head: 1-2.5 px
      trail: [{ x: 0, y: hitY }],          // relative x-offsets
      age: 0,
      maxAge: 4 + Math.random() * 6,       // lives 4-10 seconds
      wobble: Math.random() * 100,
    };
  }

  private spawnNewDrops(dt: number): void {
    // Spawn rate proportional to rain intensity: ~15-40 drops/sec
    const rate = 15 + this.currentRain * 25;
    this.spawnAccum += rate * dt;
    while (this.spawnAccum >= 1) {
      this.spawnAccum -= 1;
      if (this.rainDrops.length < 200) {
        this.rainDrops.push(this.createDrop());
      }
    }
  }

  private updateDrops(dt: number): void {
    const h = this.rainCanvas.height;

    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const d = this.rainDrops[i];
      d.age += dt;

      // Remove if too old or off-screen
      if (d.age > d.maxAge || d.y > h + 5) {
        this.rainDrops.splice(i, 1);
        continue;
      }

      // Drip downward (slow)
      d.y += d.speed * dt;

      // Slight horizontal wobble as it drips
      const wobbleX = Math.sin(d.age * 3.0 + d.wobble) * 0.3;
      d.x += wobbleX * dt * 5;

      // Record trail point every ~4px of travel
      const lastTrail = d.trail[d.trail.length - 1];
      if (d.y - lastTrail.y > 4) {
        d.trail.push({ x: wobbleX * 2, y: d.y });
        // Keep trail reasonable
        if (d.trail.length > 40) d.trail.shift();
      }
    }
  }

  private drawDrops(): void {
    const w = this.rainCanvas.width;
    const h = this.rainCanvas.height;
    const ctx = this.rainCanvas.getContext('2d')!;

    ctx.clearRect(0, 0, w, h);

    for (const d of this.rainDrops) {
      // Fade out with age
      const ageFade = 1 - Math.max(0, (d.age - d.maxAge * 0.7)) / (d.maxAge * 0.3);
      const baseAlpha = Math.min(1, ageFade) * 0.6;
      if (baseAlpha < 0.02) continue;

      // Draw thin trail
      if (d.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(190,210,230,${baseAlpha * 0.35})`;
        ctx.lineWidth = 0.5;
        const firstPt = d.trail[0];
        ctx.moveTo(d.x + firstPt.x, firstPt.y);
        for (let t = 1; t < d.trail.length; t++) {
          const pt = d.trail[t];
          ctx.lineTo(d.x + pt.x, pt.y);
        }
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
      }

      // Draw drop head (small ellipse)
      ctx.fillStyle = `rgba(200,220,240,${baseAlpha})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.headSize * 0.6, d.headSize, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tiny bright highlight on head
      ctx.fillStyle = `rgba(240,250,255,${baseAlpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y - d.headSize * 0.3, d.headSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
