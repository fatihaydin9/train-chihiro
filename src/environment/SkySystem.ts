import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import type { BiomeColorConfig } from '../biome/types';
import { lerp, smoothstep } from '../utils/math';

/**
 * Procedural sky dome with gradient, sun, moon, and stars.
 * Driven by both biome transitions and day/night cycle.
 */
export class SkySystem implements Updatable {
  private scene: THREE.Scene;
  private dome: THREE.Mesh;
  private stars: THREE.Points;
  private sun: THREE.Mesh;
  private moon: THREE.Mesh;

  // Current state
  private timeOfDay = 0.35;
  private biomeHorizon = new THREE.Color(65 / 255, 65 / 255, 72 / 255);
  private biomeSky = new THREE.Color(40 / 255, 45 / 255, 55 / 255);
  private dayNightInfluence = 1.0;
  private aurora: THREE.Mesh;
  private auroraIntensity = 0;

  // Day/night palette
  private static readonly NIGHT_ZENITH = new THREE.Color(0.01, 0.02, 0.07);
  private static readonly NIGHT_HORIZON = new THREE.Color(0.02, 0.04, 0.10);
  private static readonly DAWN_HORIZON = new THREE.Color(0.90, 0.55, 0.25);
  private static readonly DAWN_ZENITH = new THREE.Color(0.20, 0.30, 0.50);
  private static readonly DUSK_HORIZON = new THREE.Color(0.80, 0.40, 0.20);
  private static readonly DUSK_ZENITH = new THREE.Color(0.15, 0.22, 0.40);

  constructor(scene: THREE.Scene, private eventBus: EventBus) {
    this.scene = scene;
    this.scene.background = null; // Dome is the background

    // === Sky dome: upper hemisphere ===
    const domeGeo = new THREE.SphereGeometry(300, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });

    // Initialize vertex colors
    const positions = domeGeo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.dome = new THREE.Mesh(domeGeo, domeMat);
    this.dome.position.y = -5; // Slight offset so horizon aligns
    scene.add(this.dome);

    // === Stars: 200 points on inner sphere ===
    const starCount = 200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.45; // upper hemisphere only
      const r = 280;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, starMat);
    scene.add(this.stars);

    // === Sun ===
    const sunGeo = new THREE.SphereGeometry(8, 16, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88, fog: false });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(this.sun);

    // === Moon ===
    const moonGeo = new THREE.SphereGeometry(5, 12, 6);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xccccdd, fog: false });
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moon);

    // === Aurora borealis (vertical curtain in the sky) ===
    const auroraGeo = new THREE.PlaneGeometry(250, 80, 64, 1);
    const auroraMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.x += sin(pos.x * 0.02 + uTime * 0.3) * 15.0;
          pos.y += sin(pos.x * 0.03 + uTime * 0.2) * 8.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float wave = sin(vUv.x * 12.0 + uTime * 0.5) * 0.5 + 0.5;
          float fade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          vec3 green = vec3(0.1, 0.8, 0.4);
          vec3 blue = vec3(0.2, 0.4, 0.9);
          vec3 purple = vec3(0.5, 0.2, 0.7);
          vec3 col = mix(green, blue, wave);
          col = mix(col, purple, sin(vUv.x * 5.0 + uTime * 0.3) * 0.3 + 0.2);
          float alpha = fade * uOpacity * (0.3 + wave * 0.2);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this.aurora = new THREE.Mesh(auroraGeo, auroraMat);
    this.aurora.position.set(0, 150, -100);
    this.aurora.rotation.x = -0.3;
    this.aurora.visible = false;
    scene.add(this.aurora);

    // Subscribe to events
    this.eventBus.on('biome:transition-tick', (config) => {
      this.biomeSky.setRGB(config.skyColor.r, config.skyColor.g, config.skyColor.b);
      this.biomeHorizon.setRGB(
        config.skyColorHorizon.r,
        config.skyColorHorizon.g,
        config.skyColorHorizon.b,
      );
      this.dayNightInfluence = config.dayNightInfluence;
      // Aurora for polar biomes
      const name = config.name;
      const isPolar = name === 'polar' || name === 'arctic_coast' || name === 'frozen_waste';
      this.auroraIntensity = isPolar ? 1.0 : 0;
    });

    this.eventBus.on('daytime:tick', (data) => {
      this.timeOfDay = data.timeOfDay;
    });

    // Initial dome color
    this.updateDome();
  }

  update(_dt: number, elapsed: number): void {
    this.updateDome();
    this.updateCelestialBodies();
    this.updateStars();
    this.updateAurora(elapsed);
  }

  private updateAurora(elapsed: number): void {
    // Aurora only visible at night in polar biomes
    const isNight = this.timeOfDay < 0.25 || this.timeOfDay > 0.75;
    const target = isNight ? this.auroraIntensity : 0;
    const mat = this.aurora.material as THREE.ShaderMaterial;
    const cur = mat.uniforms.uOpacity.value;
    mat.uniforms.uOpacity.value = cur + (target - cur) * 0.02;
    mat.uniforms.uTime.value = elapsed;
    this.aurora.visible = mat.uniforms.uOpacity.value > 0.01;
  }

  private updateDome(): void {
    const t = this.timeOfDay;
    const influence = this.dayNightInfluence;

    // Determine zenith and horizon colors based on time of day
    const zenith = new THREE.Color();
    const horizon = new THREE.Color();

    // Wider transitions for a slower, more cinematic sunrise/sunset
    // 0.00–0.20: Night | 0.20–0.32: Dawn | 0.32–0.40: Dawn→Day
    // 0.40–0.60: Day  | 0.60–0.68: Day→Dusk | 0.68–0.80: Dusk→Night | 0.80–1.0: Night
    if (t < 0.20) {
      // Deep night
      zenith.copy(SkySystem.NIGHT_ZENITH);
      horizon.copy(SkySystem.NIGHT_HORIZON);
    } else if (t < 0.32) {
      // Dawn transition (12% of cycle ≈ 29s at 240s)
      const dt = smoothstep(0, 1, (t - 0.20) / 0.12);
      zenith.lerpColors(SkySystem.NIGHT_ZENITH, SkySystem.DAWN_ZENITH, dt);
      horizon.lerpColors(SkySystem.NIGHT_HORIZON, SkySystem.DAWN_HORIZON, dt);
    } else if (t < 0.40) {
      // Dawn to day (8% ≈ 19s)
      const dt = smoothstep(0, 1, (t - 0.32) / 0.08);
      zenith.lerpColors(SkySystem.DAWN_ZENITH, this.biomeSky, dt);
      horizon.lerpColors(SkySystem.DAWN_HORIZON, this.biomeHorizon, dt);
    } else if (t < 0.60) {
      // Full day
      zenith.copy(this.biomeSky);
      horizon.copy(this.biomeHorizon);
    } else if (t < 0.68) {
      // Day to dusk (8% ≈ 19s)
      const dt = smoothstep(0, 1, (t - 0.60) / 0.08);
      zenith.lerpColors(this.biomeSky, SkySystem.DUSK_ZENITH, dt);
      horizon.lerpColors(this.biomeHorizon, SkySystem.DUSK_HORIZON, dt);
    } else if (t < 0.80) {
      // Dusk to night (12% ≈ 29s)
      const dt = smoothstep(0, 1, (t - 0.68) / 0.12);
      zenith.lerpColors(SkySystem.DUSK_ZENITH, SkySystem.NIGHT_ZENITH, dt);
      horizon.lerpColors(SkySystem.DUSK_HORIZON, SkySystem.NIGHT_HORIZON, dt);
    } else {
      // Night
      zenith.copy(SkySystem.NIGHT_ZENITH);
      horizon.copy(SkySystem.NIGHT_HORIZON);
    }

    // Blend with biome colors based on dayNightInfluence
    // influence=0 means ignore day/night (tunnels), influence=1 means full
    if (influence < 1) {
      zenith.lerp(this.biomeSky, 1 - influence);
      horizon.lerp(this.biomeHorizon, 1 - influence);
    }

    // Update vertex colors — gradient from horizon to zenith based on Y
    const geo = this.dome.geometry;
    const positions = geo.attributes.position;
    const colors = geo.attributes.color;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const heightT = smoothstep(0, 250, y);

      colors.setXYZ(
        i,
        lerp(horizon.r, zenith.r, heightT),
        lerp(horizon.g, zenith.g, heightT),
        lerp(horizon.b, zenith.b, heightT),
      );
    }
    colors.needsUpdate = true;
  }

  private updateCelestialBodies(): void {
    const angle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const r = 250;
    const yScale = 0.35; // taller arc so sun rises properly
    const hideY = -5;

    // Eased Y: pow(sin, 0.7) — gentler easing for smooth rise/set
    const rawSin = Math.sin(angle);
    const easedSin = rawSin >= 0
      ? Math.pow(rawSin, 0.7)
      : -Math.pow(-rawSin, 0.7);

    const sunX = Math.cos(angle) * r * 0.3;
    const sunY = Math.max(easedSin * r * yScale, -50);
    const sunZ = Math.cos(angle) * r * 0.8;
    this.sun.position.set(sunX, sunY, sunZ);
    this.sun.visible = sunY > hideY;

    // Sun color: orange near horizon, yellow at zenith
    const sunMat = this.sun.material as THREE.MeshBasicMaterial;
    const maxY = r * yScale;
    const elevation = Math.max(0, sunY / maxY);
    sunMat.color.setRGB(
      1.0,
      0.6 + elevation * 0.35,
      0.2 + elevation * 0.35,
    );

    // Moon: opposite the sun, same eased curve
    const moonAngle = angle + Math.PI;
    const rawMoonSin = Math.sin(moonAngle);
    const easedMoonSin = rawMoonSin >= 0
      ? Math.pow(rawMoonSin, 0.7)
      : -Math.pow(-rawMoonSin, 0.7);

    const moonX = Math.cos(moonAngle) * r * 0.3;
    const moonY = Math.max(easedMoonSin * r * yScale, -50);
    const moonZ = Math.cos(moonAngle) * r * 0.8;
    this.moon.position.set(moonX, moonY, moonZ);
    this.moon.visible = moonY > hideY;
  }

  private updateStars(): void {
    const mat = this.stars.material as THREE.PointsMaterial;

    // Stars fade in at night, matching wider transition windows
    let starOpacity = 0;
    if (this.timeOfDay < 0.20) {
      starOpacity = 1;
    } else if (this.timeOfDay < 0.32) {
      // Fade out during dawn
      starOpacity = 1 - smoothstep(0, 1, (this.timeOfDay - 0.20) / 0.12);
    } else if (this.timeOfDay > 0.80) {
      // Full night
      starOpacity = 1;
    } else if (this.timeOfDay > 0.68) {
      // Fade in during dusk
      starOpacity = smoothstep(0, 1, (this.timeOfDay - 0.68) / 0.12);
    }

    // Tunnel influence dims stars
    starOpacity *= this.dayNightInfluence;

    mat.opacity = starOpacity;
    this.stars.visible = starOpacity > 0.01;
  }
}
