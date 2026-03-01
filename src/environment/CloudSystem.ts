import * as THREE from 'three';

import type { EventBus } from '../core/EventBus';
import type { Updatable } from '../core/GameLoop';
import { smoothstep } from '../utils/math';

/**
 * Procedural cloud dome rendered as a hemisphere (r=260) between
 * the sky dome (r=300) and celestial bodies (r=250).
 * Single draw call, fully shader-based with 2-octave FBM value noise.
 */
export class CloudSystem implements Updatable {
  private mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

  // Biome-driven target
  private targetCoverage = 0.15;
  private currentCoverage = 0.15;
  private windSpeed = 0.2;

  // Day/night state
  private timeOfDay = 0.35;
  private dayNightInfluence = 1.0;

  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    const geo = new THREE.SphereGeometry(
      260,  // between sky dome (300) and sun/moon (250)
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2, // upper hemisphere only
    );

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uCoverage: { value: 0.15 },
        uSunFactor: { value: 1.0 },
        uSunsetFactor: { value: 0.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uCoverage;
        uniform float uSunFactor;
        uniform float uSunsetFactor;

        varying vec3 vWorldPos;

        // Simple hash for value noise
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        // Value noise with bilinear interpolation
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f); // smoothstep

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        // 2-octave FBM — performant, 8 hash calls total
        float fbm(vec2 p) {
          float v = 0.0;
          v += 0.5 * noise(p);
          v += 0.25 * noise(p * 2.0 + vec2(13.7, 7.3));
          return v;
        }

        void main() {
          // Normalize position on dome to get UV-like coordinates
          vec3 dir = normalize(vWorldPos);

          // Elevation: 0 at horizon, 1 at zenith
          float elevation = dir.y;

          // Planar UV from xz direction (wind scrolls along x)
          vec2 uv = dir.xz / max(dir.y, 0.001) * 0.15;
          uv.x += uTime * 0.02; // wind drift

          // Cloud density from FBM
          float n = fbm(uv * 3.0);

          // Map coverage to density threshold
          // Higher coverage = lower threshold = more clouds
          float threshold = 1.0 - uCoverage;
          float density = smoothstep(threshold, threshold + 0.25, n);

          // Fade out at horizon (elevation < 0.1) and at zenith (elevation > 0.85)
          float horizonFade = smoothstep(0.02, 0.15, elevation);
          float zenithFade = smoothstep(0.9, 0.7, elevation);
          density *= horizonFade * zenithFade;

          // Early discard for performance
          if (density < 0.01) discard;

          // Base cloud color: white during day, dark at night
          vec3 dayColor = vec3(0.95, 0.95, 0.97);
          vec3 nightColor = vec3(0.08, 0.09, 0.12);
          vec3 sunsetColor = vec3(0.95, 0.55, 0.25);

          vec3 col = mix(nightColor, dayColor, uSunFactor);
          col = mix(col, sunsetColor, uSunsetFactor * 0.6);

          // Slight edge darkening for depth
          float edgeDark = smoothstep(0.0, 0.5, density);
          col *= 0.85 + 0.15 * edgeDark;

          float alpha = density * 0.7;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = -5; // match sky dome offset
    scene.add(this.mesh);

    // Listen to biome transitions
    this.eventBus.on('biome:transition-tick', (config) => {
      this.targetCoverage = config.cloudCoverage;
      this.windSpeed = config.windStrength;
      this.dayNightInfluence = config.dayNightInfluence;
    });

    // Listen to day/night cycle
    this.eventBus.on('daytime:tick', (data) => {
      this.timeOfDay = data.timeOfDay;
    });
  }

  update(dt: number, elapsed: number): void {
    // Smooth coverage transitions
    this.currentCoverage += (this.targetCoverage - this.currentCoverage) * Math.min(dt * 2, 1);

    const mat = this.mesh.material;
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uCoverage.value = this.currentCoverage;

    // Compute sun factor (0 = night, 1 = day)
    const t = this.timeOfDay;
    let sunFactor: number;
    if (t < 0.21 || t > 0.79) {
      sunFactor = 0;
    } else if (t < 0.29) {
      sunFactor = smoothstep(0, 1, (t - 0.21) / 0.08);
    } else if (t > 0.71) {
      sunFactor = 1 - smoothstep(0, 1, (t - 0.71) / 0.08);
    } else {
      sunFactor = 1;
    }

    // Apply dayNightInfluence (tunnels/caves ignore day/night)
    sunFactor = sunFactor * this.dayNightInfluence + (1 - this.dayNightInfluence) * 0.3;

    // Sunset/sunrise factor for orange tinting
    let sunsetFactor = 0;
    if (t > 0.21 && t < 0.29) {
      // Dawn
      const dt2 = (t - 0.21) / 0.08;
      sunsetFactor = Math.sin(dt2 * Math.PI); // peak at 0.25
    } else if (t > 0.71 && t < 0.79) {
      // Dusk
      const dt2 = (t - 0.71) / 0.08;
      sunsetFactor = Math.sin(dt2 * Math.PI); // peak at 0.75
    }
    sunsetFactor *= this.dayNightInfluence;

    mat.uniforms.uSunFactor.value = sunFactor;
    mat.uniforms.uSunsetFactor.value = sunsetFactor;

    // Hide clouds entirely when coverage is zero (tunnels/caves)
    this.mesh.visible = this.currentCoverage > 0.005;
  }
}
