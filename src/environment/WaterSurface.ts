import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import {
  CHUNK_WIDTH,
  CHUNK_DEPTH,
  CHUNK_COUNT,
  GROUND_Y,
  CABIN_WIDTH,
  CABIN_DEPTH,
} from '../utils/constants';

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Visible rolling waves
    float wave1 = sin(pos.x * 0.04 + uTime * 0.4) * cos(pos.z * 0.03 + uTime * 0.3) * 0.10;
    float wave2 = sin(pos.x * 0.12 + uTime * 0.7) * sin(pos.z * 0.10 - uTime * 0.5) * 0.04;
    float wave3 = sin(pos.x * 0.3  + uTime * 1.2) * sin(pos.z * 0.25 + uTime * 0.9) * 0.015;
    float h = wave1 + wave2 + wave3;

    pos.y += h;
    vWaveHeight = h;

    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uCabinMin;
  uniform vec3 uCabinMax;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying float vWaveHeight;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
      f.y
    );
  }

  void main() {
    // --- Cabin clip ---
    float margin = 0.15;
    float cabinX = smoothstep(uCabinMin.x - margin, uCabinMin.x, vWorldPos.x)
                 * (1.0 - smoothstep(uCabinMax.x, uCabinMax.x + margin, vWorldPos.x));
    float cabinZ = smoothstep(uCabinMin.z - margin, uCabinMin.z, vWorldPos.z)
                 * (1.0 - smoothstep(uCabinMax.z, uCabinMax.z + margin, vWorldPos.z));
    float cabinMask = 1.0 - cabinX * cabinZ;
    if (cabinMask < 0.01) discard;

    // --- Spirited Away turquoise: bright cyan base ---
    vec3 troughColor = vec3(0.0, 0.55, 0.82);   // darker in wave troughs
    vec3 crestColor  = vec3(0.05, 0.78, 0.95);   // brighter on crests

    // Wave height drives color: troughs are deeper blue, crests are bright cyan
    float crestFactor = smoothstep(-0.06, 0.08, vWaveHeight);
    vec3 color = mix(troughColor, crestColor, crestFactor);

    // --- White foam lines on wave crests ---
    float foamNoise = noise(vWorldPos.xz * 0.6 + uTime * 0.2);
    // Foam appears on the top of waves where height is positive
    float foamMask = smoothstep(0.04, 0.09, vWaveHeight) * smoothstep(0.3, 0.7, foamNoise);
    vec3 foamColor = vec3(0.85, 0.95, 1.0);
    color = mix(color, foamColor, foamMask * 0.45);

    // --- Subtle secondary foam streaks ---
    float streak = noise(vWorldPos.xz * 1.5 + vec2(uTime * 0.15, -uTime * 0.1));
    float streakMask = smoothstep(0.02, 0.06, vWaveHeight) * smoothstep(0.6, 0.85, streak);
    color = mix(color, vec3(0.7, 0.9, 0.97), streakMask * 0.2);

    // --- Edge fade ---
    float edge = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);

    float alpha = uOpacity * edge * cabinMask;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class WaterSurface implements Updatable {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetOpacity = 0;
  private currentOpacity = 0;
  private readonly waterMaxY: number;
  private readonly waterMinY: number;
  private targetY: number;

  constructor(private scene: THREE.Scene, private eventBus: EventBus) {
    const geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH * 2,
      CHUNK_DEPTH * CHUNK_COUNT,
      48,
      48,
    );
    geometry.rotateX(-Math.PI / 2);

    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uCabinMin: { value: new THREE.Vector3(-halfW, -99, -halfD) },
        uCabinMax: { value: new THREE.Vector3(halfW, 99, halfD) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.waterMaxY = GROUND_Y + 0.6;
    this.waterMinY = GROUND_Y - 3;
    this.targetY = this.waterMinY;

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = this.waterMinY;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 999;
    scene.add(this.mesh);

    let firstTick = true;
    this.eventBus.on('biome:transition-tick', (data) => {
      const inOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';

      if (inOcean) {
        this.targetOpacity = 0.75;
        this.targetY = this.waterMaxY;
        if (firstTick) {
          this.currentOpacity = 0.75;
          this.mesh.position.y = this.waterMaxY;
          this.material.uniforms.uOpacity.value = 0.75;
          this.mesh.visible = true;
        }
      } else {
        this.targetOpacity = 0;
        this.targetY = this.waterMinY;
      }
      firstTick = false;
    });
  }

  setCamera(_cam: THREE.Camera): void {
    // kept for API compat
  }

  get waterY(): number {
    return this.mesh.position.y;
  }

  get visible(): boolean {
    return this.mesh.visible;
  }

  update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    const yLerp = Math.min(dt * 0.4, 1);
    this.mesh.position.y += (this.targetY - this.mesh.position.y) * yLerp;

    const opLerp = Math.min(dt * 0.5, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * opLerp;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.mesh.visible = this.currentOpacity > 0.01;
  }
}
