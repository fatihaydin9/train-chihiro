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
    // Almost perfectly flat — micro undulation only
    pos.y += sin(pos.x * 0.04 + uTime * 0.15) * 0.015
           + sin(pos.z * 0.03 + uTime * 0.1)  * 0.01;
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
    // Vivid Spirited Away cyan-blue
    vec3 color = vec3(0.15, 0.55, 0.85);

    // Very faint shimmer — no visible bands
    float shimmer = sin(vWorldPos.x * 0.07 + uTime * 0.12)
                  * sin(vWorldPos.z * 0.05 + uTime * 0.08);
    color += shimmer * 0.03;

    // Edge fade at mesh borders only
    float edge = smoothstep(0.0, 0.04, vUv.y) * smoothstep(1.0, 0.96, vUv.y);

    gl_FragColor = vec4(color, uOpacity * edge);
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
      24,
      24,
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

    this.waterMaxY = GROUND_Y + 0.6; // water covers ground, flora partially submerged
    this.waterMinY = GROUND_Y - 3;
    this.targetY = this.waterMinY;

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = this.waterMinY;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 999; // render last so everything beneath shows through
    scene.add(this.mesh);

    this.eventBus.on('biome:transition-tick', (data) => {
      const inOcean = data.fromBiome === 'ocean' || data.toBiome === 'ocean';

      if (inOcean) {
        this.targetOpacity = 0.35;
        this.targetY = this.waterMaxY;
      } else {
        this.targetOpacity = 0;
        this.targetY = this.waterMinY;
      }
    });
  }

  update(dt: number, elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed;

    // Slow smooth rise/fall of water level
    const yLerp = Math.min(dt * 0.4, 1); // slow Y transition
    this.mesh.position.y += (this.targetY - this.mesh.position.y) * yLerp;

    // Slow opacity fade
    const opLerp = Math.min(dt * 0.5, 1);
    this.currentOpacity += (this.targetOpacity - this.currentOpacity) * opLerp;
    this.material.uniforms.uOpacity.value = this.currentOpacity;

    this.mesh.visible = this.currentOpacity > 0.01;
  }
}
