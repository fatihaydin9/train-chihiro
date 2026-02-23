import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import { CHUNK_WIDTH, CHUNK_DEPTH, CHUNK_COUNT, GROUND_Y } from '../utils/constants';

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.y += sin(pos.x * 0.5 + uTime) * 0.15 + sin(pos.z * 0.3 + uTime * 0.7) * 0.1;
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
    // Teal/blue base with subtle variation
    float wave = sin(vWorldPos.x * 0.3 + uTime * 0.5) * 0.5 + 0.5;
    vec3 color = mix(vec3(0.1, 0.35, 0.45), vec3(0.15, 0.45, 0.55), wave);
    // Fresnel-like edge brightening using UV
    float edge = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    float alpha = uOpacity * edge;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class WaterSurface implements Updatable {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private targetOpacity = 0;
  private currentOpacity = 0;

  constructor(private scene: THREE.Scene, private eventBus: EventBus) {
    const geometry = new THREE.PlaneGeometry(
      CHUNK_WIDTH * 2,
      CHUNK_DEPTH * CHUNK_COUNT,
      40,
      40,
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

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = GROUND_Y + 3;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.eventBus.on('biome:transition-tick', (data) => {
      if (data.toBiome === 'deep_ocean') {
        this.targetOpacity = data.transitionProgress * 0.45;
      } else if (data.fromBiome === 'deep_ocean') {
        this.targetOpacity = (1 - data.transitionProgress) * 0.45;
      } else {
        this.targetOpacity = 0;
      }
    });
  }

  update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    // Smooth fade
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * Math.min(dt * 3, 1);
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.mesh.visible = this.currentOpacity > 0.01;
  }
}
