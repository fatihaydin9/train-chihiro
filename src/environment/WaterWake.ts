import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { CABIN_WIDTH, CABIN_DEPTH, GROUND_Y } from '../utils/constants';

// Spirited Away style: small white foam splash at the train waterline
const wakeVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.2 + uTime * 1.0) * 0.008
           + sin(pos.z * 0.15 + uTime * 0.7) * 0.005;
    vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const wakeFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uCabinMin;
  uniform vec3 uCabinMax;

  varying vec2 vUv;
  varying vec3 vWorldPos;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
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

    float lx = (vUv.x - 0.5) * 2.0; // -1..1
    float lz = vUv.y; // 0..1

    // --- Wide foam at train sides ---
    float trainEdgeDist = abs(lx) - 0.15;
    float sideFoam = (1.0 - smoothstep(0.0, 0.45, trainEdgeDist))
                   * smoothstep(0.03, 0.12, lz)
                   * (1.0 - smoothstep(0.55, 0.85, lz));

    // Strong bow wave at front
    float bowFoam = (1.0 - smoothstep(0.0, 0.3, abs(lx)))
                  * (1.0 - smoothstep(0.0, 0.15, lz));

    // V-shaped trailing wake
    float spread = lz * 0.55;
    float trailDist = abs(lx) - spread;
    float trail = (1.0 - smoothstep(-0.06, 0.12, trailDist))
                * smoothstep(0.1, 0.25, lz)
                * (1.0 - smoothstep(0.55, 0.9, lz));

    // Animated foam noise
    vec2 scrollUV = vWorldPos.xz * 0.6 + vec2(0.0, -uTime * 2.0);
    float n = noise(scrollUV * 4.0) * 0.45 + noise(scrollUV * 8.0) * 0.35 + noise(scrollUV * 15.0) * 0.2;

    float intensity = (sideFoam * 0.9 + bowFoam * 0.8 + trail * 0.6) * n;
    intensity = clamp(intensity, 0.0, 1.0);

    // White foam
    vec3 foamColor = vec3(0.95, 0.98, 1.0);

    float alpha = intensity * uOpacity * cabinMask;
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(foamColor, alpha);
  }
`;

export class WaterWake implements Updatable {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetOpacity = 0;
  private currentOpacity = 0;
  private readonly waterMaxY: number;

  constructor(private scene: THREE.Scene, private eventBus: EventBus) {
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;

    // Wide wake: 12m wide, 24m long
    const geometry = new THREE.PlaneGeometry(12, 24, 16, 16);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      vertexShader: wakeVertexShader,
      fragmentShader: wakeFragmentShader,
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

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = GROUND_Y - 3;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1000;
    scene.add(this.mesh);

    let firstTick = true;
    this.eventBus.on('biome:transition-tick', (data) => {
      const inOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';
      this.targetOpacity = inOcean ? 0.7 : 0;
      if (firstTick && inOcean) {
        this.currentOpacity = 0.7;
        this.mesh.position.y = this.waterMaxY + 0.02;
        this.material.uniforms.uOpacity.value = 0.7;
        this.mesh.visible = true;
      }
      firstTick = false;
    });
  }

  update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    const targetY = this.targetOpacity > 0 ? this.waterMaxY + 0.02 : GROUND_Y - 3;
    const yLerp = Math.min(dt * 0.4, 1);
    this.mesh.position.y += (targetY - this.mesh.position.y) * yLerp;

    const opLerp = Math.min(dt * 0.5, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * opLerp;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.mesh.visible = this.currentOpacity > 0.01;
  }
}
