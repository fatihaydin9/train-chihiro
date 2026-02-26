import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_COUNT, GROUND_Y } from '../utils/constants';

// Spirited Away: flat crystal-clear water, tracks visible beneath
const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Gentle rolling waves
    float wave1 = sin(pos.x * 0.06 + uTime * 0.4) * 0.08;
    float wave2 = sin(pos.z * 0.04 + uTime * 0.3) * 0.06;
    float wave3 = sin((pos.x + pos.z) * 0.08 + uTime * 0.5) * 0.04;
    pos.y += wave1 + wave2 + wave3;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Crystal clear sky blue — Spirited Away style
    vec3 baseColor = vec3(0.4, 0.68, 0.98);

    // Light caustic shimmer
    float caustic = sin(vWorldPos.x * 0.12 + uTime * 0.2) * cos(vWorldPos.z * 0.1 + uTime * 0.15);
    baseColor += caustic * 0.04;

    // Sparkle highlights
    float sparkle = sin(vWorldPos.x * 0.25 + uTime * 0.35)
                  * sin(vWorldPos.z * 0.22 + uTime * 0.28);
    baseColor += max(sparkle, 0.0) * 0.06;

    // Edge fade at mesh borders
    float edge = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);

    gl_FragColor = vec4(baseColor, uOpacity * edge);
  }
`;

const JELLY_COUNT = 40;

export class WaterSurface implements Updatable {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetOpacity = 0;
  private currentOpacity = 0;
  private readonly waterMaxY: number;
  private readonly waterMinY: number;
  private targetY: number;

  // Jellyfish
  private jellyfish: THREE.Points;
  private jellyPositions: Float32Array;
  private jellyOffsets: Float32Array;
  private jellyMat: THREE.PointsMaterial;
  private isOcean = false;
  private isNight = false;
  private jellyOpacity = 0;

  constructor(private scene: THREE.Scene, private eventBus: EventBus) {
    const geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH * 2,
      CHUNK_DEPTH * CHUNK_COUNT,
      64,
      64,
    );
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.waterMaxY = GROUND_Y + 0.15; // slightly above track — rails visible through clear water
    this.waterMinY = GROUND_Y - 3;
    this.targetY = this.waterMinY;

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = this.waterMinY;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 999;
    scene.add(this.mesh);

    // === Jellyfish: glowing points under water at night ===
    this.jellyPositions = new Float32Array(JELLY_COUNT * 3);
    this.jellyOffsets = new Float32Array(JELLY_COUNT);
    for (let i = 0; i < JELLY_COUNT; i++) {
      this.jellyPositions[i * 3] = (Math.random() - 0.5) * CHUNK_WIDTH * 1.5;
      this.jellyPositions[i * 3 + 1] = GROUND_Y - 0.5 - Math.random() * 1.5;
      this.jellyPositions[i * 3 + 2] = (Math.random() - 0.5) * CHUNK_DEPTH * CHUNK_COUNT * 0.8;
      this.jellyOffsets[i] = Math.random() * Math.PI * 2;
    }
    const jellyGeo = new THREE.BufferGeometry();
    jellyGeo.setAttribute('position', new THREE.BufferAttribute(this.jellyPositions, 3));
    this.jellyMat = new THREE.PointsMaterial({
      color: 0x88ddff,
      size: 1.2,
      transparent: true,
      opacity: 0,
      fog: false,
      sizeAttenuation: true,
    });
    this.jellyfish = new THREE.Points(jellyGeo, this.jellyMat);
    this.jellyfish.visible = false;
    scene.add(this.jellyfish);

    this.eventBus.on('biome:transition-tick', (data) => {
      this.isOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';

      if (this.isOcean) {
        this.targetOpacity = 0.18;
        this.targetY = this.waterMaxY;
      } else {
        this.targetOpacity = 0;
        this.targetY = this.waterMinY;
      }
    });

    this.eventBus.on('daytime:tick', (data) => {
      this.isNight = data.timeOfDay < 0.22 || data.timeOfDay > 0.78;
    });
  }

  update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    // Slow smooth rise/fall of water level
    const yLerp = Math.min(dt * 0.4, 1);
    this.mesh.position.y += (this.targetY - this.mesh.position.y) * yLerp;

    // Slow opacity fade
    const opLerp = Math.min(dt * 0.5, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * opLerp;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.mesh.visible = this.currentOpacity > 0.01;

    // === Jellyfish ===
    const jellyTarget = (this.isOcean && this.isNight) ? 0.6 : 0;
    this.jellyOpacity += (jellyTarget - this.jellyOpacity) * dt * 0.8;
    this.jellyMat.opacity = this.jellyOpacity;
    this.jellyfish.visible = this.jellyOpacity > 0.01;

    if (this.jellyfish.visible) {
      const pos = this.jellyfish.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < JELLY_COUNT; i++) {
        const off = this.jellyOffsets[i];
        // Gentle float: up/down bob + slow horizontal drift
        const y = this.jellyPositions[i * 3 + 1] + Math.sin(elapsed * 0.3 + off) * 0.15;
        const x = this.jellyPositions[i * 3] + Math.sin(elapsed * 0.1 + off * 2) * 0.3;
        pos.setY(i, y);
        pos.setX(i, x);
      }
      pos.needsUpdate = true;

      // Pulsing glow color
      const pulse = Math.sin(elapsed * 0.8) * 0.15 + 0.85;
      this.jellyMat.color.setRGB(0.4 * pulse, 0.85 * pulse, 1.0 * pulse);
    }
  }
}
