import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { GROUND_Y } from '../utils/constants';

const FIREFLY_COUNT = 60;
const WATER_Y = GROUND_Y + 0.05;  // just above water surface
const MAX_Y = GROUND_Y + 4.0;

/**
 * Fireflies that appear over water at night in the ocean biome.
 * Each firefly pulses with a random phase, creating a magical atmosphere.
 */
export class Fireflies implements Updatable {
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private inOcean = false;
  private sunFactor = 1.0;
  private targetOpacity = 0;
  private currentOpacity = 0;

  // Per-firefly random data: phase, speed, amplitude
  private phases: Float32Array;

  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    const positions = new Float32Array(FIREFLY_COUNT * 3);
    const sizes = new Float32Array(FIREFLY_COUNT);
    this.phases = new Float32Array(FIREFLY_COUNT * 3); // phase, blinkSpeed, blinkOffset

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      // All fireflies start at water surface — they will rise via shader
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 30;
      positions[i * 3] = Math.cos(angle) * dist;
      positions[i * 3 + 1] = WATER_Y;  // start at water
      positions[i * 3 + 2] = Math.sin(angle) * dist;

      // Much smaller sizes
      sizes[i] = 0.08 + Math.random() * 0.1;

      // Animation params: wander phase, rise type (0-4), rise speed
      this.phases[i * 3] = Math.random() * Math.PI * 2;
      this.phases[i * 3 + 1] = Math.floor(Math.random() * 5.0); // 5 rise patterns
      this.phases[i * 3 + 2] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uMaxRiseHeight: { value: MAX_Y - WATER_Y },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uMaxRiseHeight;
        varying float vBrightness;

        float hash(float n) {
          return fract(sin(n) * 43758.5453);
        }

        void main() {
          float id = float(gl_VertexID);
          float phase = hash(id * 1.17) * 6.28;
          float speed = 0.15 + hash(id * 2.31) * 0.3;
          float riseType = floor(hash(id * 4.53) * 5.0); // 0..4
          float riseDelay = hash(id * 7.19) * 12.0; // stagger starts
          float t = max(0.0, uTime - riseDelay);

          vec3 pos = position;

          // --- 5 different rise patterns from water surface ---
          float maxH = uMaxRiseHeight * (0.5 + hash(id * 6.11) * 0.5);

          if (riseType < 1.0) {
            // Pattern 0: Slow straight rise with gentle sway
            float rise = min(t * 0.15, 1.0);
            pos.y += rise * maxH;
            pos.x += sin(t * speed + phase) * 0.8;
            pos.z += cos(t * speed * 0.8 + phase) * 0.6;
          } else if (riseType < 2.0) {
            // Pattern 1: Spiral rise — corkscrewing upward
            float rise = min(t * 0.12, 1.0);
            float spiralR = 1.5 + hash(id * 3.3) * 2.0;
            pos.y += rise * maxH;
            pos.x += sin(t * 0.6 + phase) * spiralR * rise;
            pos.z += cos(t * 0.6 + phase) * spiralR * rise;
          } else if (riseType < 3.0) {
            // Pattern 2: Burst up then float — quick launch, slow drift
            float burst = 1.0 - exp(-t * 0.5);
            pos.y += burst * maxH;
            pos.x += sin(t * speed * 0.5 + phase) * 2.0 * burst;
            pos.z += cos(t * speed * 0.4 + phase * 1.5) * 1.5 * burst;
          } else if (riseType < 4.0) {
            // Pattern 3: Zigzag rise — side to side as it climbs
            float rise = min(t * 0.18, 1.0);
            pos.y += rise * maxH;
            float zigzag = sin(t * 1.8 + phase) * 2.5;
            pos.x += zigzag * rise;
            pos.z += cos(t * 0.3 + phase) * 0.5;
          } else {
            // Pattern 4: Floating drift — very slow rise, wide horizontal wander
            float rise = min(t * 0.08, 1.0);
            pos.y += rise * maxH * 0.6;
            pos.x += sin(t * 0.25 + phase) * 4.0 * rise;
            pos.z += cos(t * 0.2 + phase * 0.7) * 3.5 * rise;
          }

          // Small wobble on top of all patterns
          pos.x += sin(t * 0.7 + phase * 2.1) * 0.2;
          pos.y += sin(t * 0.5 + phase * 1.7) * 0.15;

          // Blinking
          float blinkSpeed = 0.5 + hash(id * 3.71) * 1.5;
          float blinkOffset = hash(id * 5.13) * 6.28;
          float raw = sin(uTime * blinkSpeed + blinkOffset);
          float glow = smoothstep(0.3, 0.8, raw);
          // Fade in as it rises from water
          float riseFade = smoothstep(0.0, 0.3, (pos.y - position.y) / maxH);
          vBrightness = glow * riseFade;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPos.z) * uOpacity;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vBrightness;

        void main() {
          float dist = length(gl_PointCoord - 0.5) * 2.0;
          float glow = 1.0 - smoothstep(0.0, 1.0, dist);
          glow *= glow;

          vec3 color = mix(vec3(0.4, 0.85, 0.1), vec3(0.95, 1.0, 0.3), vBrightness * 0.5) * 2.5;
          float alpha = glow * vBrightness * uOpacity;

          if (alpha < 0.01) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);

    // Track biome
    this.eventBus.on('biome:transition-tick', (data) => {
      this.inOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';
    });

    // Track day/night
    this.eventBus.on('daytime:tick', (data) => {
      const t = data.timeOfDay;
      if (t < 0.21) this.sunFactor = 0;
      else if (t < 0.29) this.sunFactor = Math.min(1, (t - 0.21) / 0.08);
      else if (t < 0.71) this.sunFactor = 1;
      else if (t < 0.79) this.sunFactor = Math.max(0, 1 - (t - 0.71) / 0.08);
      else this.sunFactor = 0;
    });
  }

  update(dt: number, elapsed: number): void {
    // Fireflies appear in ocean at night (sunFactor < 0.3)
    const nightFactor = this.inOcean ? Math.max(0, 1 - this.sunFactor / 0.3) : 0;
    this.targetOpacity = nightFactor;

    const lerpSpeed = Math.min(dt * 0.8, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * lerpSpeed;

    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.points.visible = this.currentOpacity > 0.01;
  }
}
