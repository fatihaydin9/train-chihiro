import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { GROUND_Y } from '../utils/constants';

const FIREFLY_COUNT = 30;
const MIN_Y = GROUND_Y + 0.3;
const MAX_Y = GROUND_Y + 5.0;

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
      // Scatter around the train — left, right, front, behind
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 25; // 3m–28m from center
      positions[i * 3] = Math.cos(angle) * dist;
      positions[i * 3 + 1] = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
      positions[i * 3 + 2] = Math.sin(angle) * dist;

      sizes[i] = 0.4 + Math.random() * 0.4;

      // Random animation params
      this.phases[i * 3] = Math.random() * Math.PI * 2;     // wander phase
      this.phases[i * 3 + 1] = 0.5 + Math.random() * 2.0;  // blink speed
      this.phases[i * 3 + 2] = Math.random() * Math.PI * 2; // blink offset
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
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uTime;
        uniform float uOpacity;
        varying float vBrightness;

        float hash(float n) {
          return fract(sin(n) * 43758.5453);
        }

        void main() {
          // Gentle wandering motion
          float id = float(gl_VertexID);
          float phase = hash(id * 1.17) * 6.28;
          float speed = 0.3 + hash(id * 2.31) * 0.5;

          vec3 pos = position;
          pos.x += sin(uTime * speed + phase) * 1.5;
          pos.y += sin(uTime * speed * 0.7 + phase * 1.3) * 0.8;
          pos.z += cos(uTime * speed * 0.6 + phase * 0.7) * 1.2;

          // Blinking: each firefly has its own rhythm, intermittent flashes
          float blinkSpeed = 0.4 + hash(id * 3.71) * 1.0;
          float blinkOffset = hash(id * 5.13) * 6.28;
          // Flash when sin > 0.4 (~30% of the time)
          float raw = sin(uTime * blinkSpeed + blinkOffset);
          float glow = smoothstep(0.4, 0.85, raw);
          vBrightness = glow;

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (350.0 / -mvPos.z) * uOpacity;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vBrightness;

        void main() {
          // Soft circular glow
          float dist = length(gl_PointCoord - 0.5) * 2.0;
          float glow = 1.0 - smoothstep(0.0, 1.0, dist);
          glow *= glow; // softer falloff

          // Yellow-green glow — bright and punchy
          vec3 color = mix(vec3(0.5, 0.9, 0.1), vec3(0.9, 1.0, 0.2), vBrightness * 0.5) * 3.0;
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
