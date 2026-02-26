import * as THREE from 'three';
import type { ParticleConfig } from './types';
import {
  CABIN_WIDTH, CABIN_DEPTH, CABIN_FLOOR_Y, CABIN_HEIGHT,
} from '../utils/constants';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSpread;
  uniform float uHeight;
  uniform float uDrift;
  uniform float uWind;
  uniform float uRise;
  uniform vec3 uCabinMin;
  uniform vec3 uCabinMax;

  attribute float aOffset;

  varying float vAlpha;
  varying float vIsStreak;

  void main() {
    vec3 pos = position;

    // Animate: fall down (or rise up if uRise == 1), loop, drift horizontally
    float t = mod(aOffset + uTime * uSpeed / uHeight, 1.0);
    pos.y = mix(uHeight * (1.0 - t), uHeight * t, uRise) - 1.5;

    // Rain (speed>5): diagonal fall driven by wind+drift; others: gentle oscillation
    float isRain = step(5.0, uSpeed);
    // t goes 0→1 as particle falls — use it for consistent diagonal displacement
    float diagX = isRain * uDrift * t * 8.0;
    float oscX = sin(uTime * 0.5 + aOffset * 6.28) * uDrift * (1.0 - isRain * 0.7);
    pos.x += oscX + diagX;
    pos.z += cos(uTime * 0.3 + aOffset * 3.14) * uDrift * 0.3;

    vAlpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t);

    // Hide particles inside the train cabin (convert to world space)
    vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    if (worldPos.x > uCabinMin.x && worldPos.x < uCabinMax.x &&
        worldPos.y > uCabinMin.y && worldPos.y < uCabinMax.y &&
        worldPos.z > uCabinMin.z && worldPos.z < uCabinMax.z) {
      vAlpha = 0.0;
    }

    // Pass streak hint: speed > 5 means rain/storm type → render as streak
    vIsStreak = uSpeed > 5.0 ? 1.0 : 0.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float rawSize = INJECT_SIZE * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(rawSize, 2.0, 20.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;
  varying float vIsStreak;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    if (vIsStreak > 0.5) {
      // Diagonal rain streak (~30 degrees)
      float angle = 0.5;
      float ca = cos(angle);
      float sa = sin(angle);
      vec2 ruv = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);

      // Thin vertical streak: narrow in X, full in Y
      float streakWidth = 0.06;
      float dx = abs(ruv.x) / streakWidth;
      float dy = abs(ruv.y) / 0.5;
      if (dx > 1.0 || dy > 1.0) discard;

      float alpha = (1.0 - dx) * (1.0 - dy * dy) * vAlpha * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    } else {
      // Default: soft circle for snow, petals, etc.
      float dist = length(uv);
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * uOpacity;
      gl_FragColor = vec4(uColor, alpha);
    }
  }
`;

export class ParticleEmitter {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private baseOpacity: number;

  constructor(config: ParticleConfig) {
    this.baseOpacity = config.opacity;
    const count = config.count;
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * config.spread;
      positions[i * 3 + 1] = Math.random() * config.height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * config.spread;
      offsets[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    // Inject size into vertex shader
    const vs = vertexShader.replace(
      'INJECT_SIZE',
      config.size.toFixed(3),
    );

    // Cabin bounding box — small inward margin so particles just outside walls are visible
    const cabinMin = new THREE.Vector3(
      -CABIN_WIDTH / 2 + 0.15,
      CABIN_FLOOR_Y,
      -CABIN_DEPTH / 2 + 0.15,
    );
    const cabinMax = new THREE.Vector3(
      CABIN_WIDTH / 2 - 0.15,
      CABIN_FLOOR_Y + CABIN_HEIGHT,
      CABIN_DEPTH / 2 - 0.15,
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: config.speed },
        uSpread: { value: config.spread },
        uHeight: { value: config.height },
        uDrift: { value: config.drift },
        uWind: { value: 0 },
        uRise: { value: config.rises ? 1.0 : 0.0 },
        uColor: { value: new THREE.Color(config.color) },
        uOpacity: { value: config.opacity },
        uCabinMin: { value: cabinMin },
        uCabinMax: { value: cabinMax },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(elapsed: number, wind: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uWind.value = wind;
  }

  /** opacity is a 0–1 scale multiplied with the config's base opacity */
  setOpacity(scale: number): void {
    this.material.uniforms.uOpacity.value = this.baseOpacity * scale;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
