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
  SA_CAR_START_Z,
  SA_CAR_DEPTH,
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
  uniform float uSunFactor;
  uniform vec3 uTrainLightPos;
  uniform float uTrainLightOn;

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

    // --- Day/night water colors ---
    // Day: Spirited Away turquoise
    vec3 dayTrough = vec3(0.0, 0.55, 0.82);
    vec3 dayCrest  = vec3(0.05, 0.78, 0.95);
    // Night: deep dark ocean
    vec3 nightTrough = vec3(0.01, 0.04, 0.10);
    vec3 nightCrest  = vec3(0.02, 0.08, 0.18);

    vec3 troughColor = mix(nightTrough, dayTrough, uSunFactor);
    vec3 crestColor  = mix(nightCrest, dayCrest, uSunFactor);

    // Wave height drives color
    float crestFactor = smoothstep(-0.06, 0.08, vWaveHeight);
    vec3 color = mix(troughColor, crestColor, crestFactor);

    // --- White foam lines on wave crests (dimmer at night) ---
    float foamNoise = noise(vWorldPos.xz * 0.6 + uTime * 0.2);
    float foamMask = smoothstep(0.04, 0.09, vWaveHeight) * smoothstep(0.3, 0.7, foamNoise);
    vec3 foamColor = mix(vec3(0.12, 0.18, 0.3), vec3(0.85, 0.95, 1.0), uSunFactor);
    color = mix(color, foamColor, foamMask * 0.45);

    // --- Subtle secondary foam streaks ---
    float streak = noise(vWorldPos.xz * 1.5 + vec2(uTime * 0.15, -uTime * 0.1));
    float streakMask = smoothstep(0.02, 0.06, vWaveHeight) * smoothstep(0.6, 0.85, streak);
    vec3 streakColor = mix(vec3(0.08, 0.14, 0.25), vec3(0.7, 0.9, 0.97), uSunFactor);
    color = mix(color, streakColor, streakMask * 0.2);

    // --- Moonlight shimmer at night ---
    float moonShimmer = noise(vWorldPos.xz * 0.8 + vec2(uTime * 0.3, uTime * 0.15));
    float moonMask = (1.0 - uSunFactor) * smoothstep(0.65, 0.9, moonShimmer) * 0.15;
    color += vec3(0.15, 0.2, 0.35) * moonMask;

    // --- Train headlight reflection on water ---
    float distToLight = length(vWorldPos.xz - uTrainLightPos.xz);
    float lightCone = smoothstep(25.0, 2.0, distToLight);
    // Directional: stronger ahead of train (-Z)
    float ahead = smoothstep(5.0, -20.0, vWorldPos.z - uTrainLightPos.z);
    float lightIntensity = lightCone * ahead * uTrainLightOn * (1.0 - uSunFactor * 0.8);
    // Ripple the light reflection
    float ripple = 0.7 + 0.3 * sin(vWorldPos.x * 2.0 + uTime * 1.5) * sin(vWorldPos.z * 1.5 + uTime * 1.2);
    vec3 lightColor = vec3(1.0, 0.92, 0.7); // warm headlight
    color += lightColor * lightIntensity * ripple * 0.5;

    // --- Edge fade ---
    float edge = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);

    float alpha = uOpacity * edge * cabinMask;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class WaterSurface implements Updatable {
  private mesh: THREE.Mesh;
  private occluder: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetOpacity = 0;
  private currentOpacity = 0;
  private readonly waterMaxY: number;
  private readonly waterMinY: number;
  private targetY: number;
  private sunFactor = 1.0;
  private headlightMode = 0; // 0=off, 1=short, 2=long

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
    // Clip zone extends from cabin front to SA car back, with generous padding
    const clipMaxZ = SA_CAR_START_Z + SA_CAR_DEPTH + 0.5;
    const clipPad = 0.5; // extra padding beyond walls

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uCabinMin: { value: new THREE.Vector3(-halfW - clipPad, -99, -halfD - clipPad) },
        uCabinMax: { value: new THREE.Vector3(halfW + clipPad, 99, clipMaxZ) },
        uSunFactor: { value: 1.0 },
        uTrainLightPos: { value: new THREE.Vector3(0, 0, -halfD - 1) },
        uTrainLightOn: { value: 0.0 },
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

    // Invisible occluder: an opaque plane inside the train that writes to depth
    // buffer BEFORE the water renders, blocking water from showing through floors.
    // Positioned at water level so it occludes water fragments via depth test.
    const occluderMat = new THREE.MeshBasicMaterial({
      colorWrite: false,   // don't draw any color — completely invisible
      depthWrite: true,    // but DO write to depth buffer
    });
    const occW = CABIN_WIDTH + 1.0;
    const occD = clipMaxZ - (-halfD) + 1.0;
    const occGeo = new THREE.PlaneGeometry(occW, occD);
    occGeo.rotateX(-Math.PI / 2);
    this.occluder = new THREE.Mesh(occGeo, occluderMat);
    this.occluder.position.set(0, this.waterMaxY + 0.05, (-halfD + clipMaxZ) / 2);
    this.occluder.frustumCulled = false;
    this.occluder.visible = false;
    this.occluder.renderOrder = 998; // render just BEFORE water (999)
    scene.add(this.occluder);

    let firstTick = true;
    this.eventBus.on('biome:transition-tick', (data) => {
      const inOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';

      if (inOcean) {
        this.targetOpacity = 0.75;
        this.targetY = this.waterMaxY;
        this.occluder.visible = true;
        if (firstTick) {
          this.currentOpacity = 0.75;
          this.mesh.position.y = this.waterMaxY;
          this.material.uniforms.uOpacity.value = 0.75;
          this.mesh.visible = true;
        }
      } else {
        this.targetOpacity = 0;
        this.targetY = this.waterMinY;
        this.occluder.visible = false;
      }
      firstTick = false;
    });

    // Track sun intensity for night water coloring
    this.eventBus.on('daytime:tick', (data) => {
      const t = data.timeOfDay;
      if (t < 0.21) this.sunFactor = 0;
      else if (t < 0.29) this.sunFactor = Math.min(1, (t - 0.21) / 0.08);
      else if (t < 0.71) this.sunFactor = 1;
      else if (t < 0.79) this.sunFactor = Math.max(0, 1 - (t - 0.71) / 0.08);
      else this.sunFactor = 0;
    });

    // Track headlight state (cycles: off → short → long → off)
    this.eventBus.on('interaction:light-toggle', () => {
      this.headlightMode = (this.headlightMode + 1) % 3;
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
    this.material.uniforms.uSunFactor.value = this.sunFactor;
    this.material.uniforms.uTrainLightOn.value = this.headlightMode > 0 ? 1.0 : 0.0;

    const yLerp = Math.min(dt * 0.4, 1);
    this.mesh.position.y += (this.targetY - this.mesh.position.y) * yLerp;

    // Keep occluder just above water so it writes depth before water renders
    this.occluder.position.y = this.mesh.position.y + 0.05;

    const opLerp = Math.min(dt * 0.5, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * opLerp;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    const vis = this.currentOpacity > 0.01;
    this.mesh.visible = vis;
    if (!vis) this.occluder.visible = false;
  }
}
