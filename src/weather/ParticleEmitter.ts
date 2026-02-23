import * as THREE from 'three';
import type { ParticleConfig } from './types';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uSpread;
  uniform float uHeight;
  uniform float uDrift;
  uniform float uWind;
  uniform float uRise;

  attribute float aOffset;

  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Animate: fall down (or rise up if uRise == 1), loop, drift horizontally
    float t = mod(aOffset + uTime * uSpeed / uHeight, 1.0);
    pos.y = mix(uHeight * (1.0 - t), uHeight * t, uRise) - 1.5;
    pos.x += sin(uTime * 0.5 + aOffset * 6.28) * uDrift + uWind * uTime;
    pos.z += cos(uTime * 0.3 + aOffset * 3.14) * uDrift * 0.5;

    vAlpha = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.9, t);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = ${/* will be set per-config */ ''}size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vAlpha;

  void main() {
    // Soft circle
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class ParticleEmitter {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;

  constructor(config: ParticleConfig) {
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
      `size * (300.0 / -mvPosition.z)`,
      `${config.size.toFixed(3)} * (300.0 / -mvPosition.z)`,
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
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(elapsed: number, wind: number): void {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uWind.value = wind;
  }

  setOpacity(opacity: number): void {
    this.material.uniforms.uOpacity.value = opacity;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
