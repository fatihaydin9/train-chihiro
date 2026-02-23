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
  private biomeHorizon = new THREE.Color(0.5, 0.55, 0.65);
  private biomeSky = new THREE.Color(0.4, 0.5, 0.7);
  private dayNightInfluence = 1.0;

  // Day/night palette
  private static readonly NIGHT_ZENITH = new THREE.Color(0.05, 0.05, 0.12);
  private static readonly NIGHT_HORIZON = new THREE.Color(0.08, 0.06, 0.15);
  private static readonly DAWN_HORIZON = new THREE.Color(0.9, 0.55, 0.3);
  private static readonly DAWN_ZENITH = new THREE.Color(0.4, 0.4, 0.6);
  private static readonly DUSK_HORIZON = new THREE.Color(0.85, 0.45, 0.2);
  private static readonly DUSK_ZENITH = new THREE.Color(0.5, 0.3, 0.5);

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

    // Subscribe to events
    this.eventBus.on('biome:transition-tick', (config) => {
      this.biomeSky.setRGB(config.skyColor.r, config.skyColor.g, config.skyColor.b);
      this.biomeHorizon.setRGB(
        config.skyColorHorizon.r,
        config.skyColorHorizon.g,
        config.skyColorHorizon.b,
      );
      this.dayNightInfluence = config.dayNightInfluence;
    });

    this.eventBus.on('daytime:tick', (data) => {
      this.timeOfDay = data.timeOfDay;
    });

    // Initial dome color
    this.updateDome();
  }

  update(_dt: number, _elapsed: number): void {
    this.updateDome();
    this.updateCelestialBodies();
    this.updateStars();
  }

  private updateDome(): void {
    const t = this.timeOfDay;
    const influence = this.dayNightInfluence;

    // Determine zenith and horizon colors based on time of day
    const zenith = new THREE.Color();
    const horizon = new THREE.Color();

    if (t < 0.2) {
      // Night
      zenith.copy(SkySystem.NIGHT_ZENITH);
      horizon.copy(SkySystem.NIGHT_HORIZON);
    } else if (t < 0.3) {
      // Dawn transition
      const dt = (t - 0.2) / 0.1;
      zenith.lerpColors(SkySystem.NIGHT_ZENITH, SkySystem.DAWN_ZENITH, dt);
      horizon.lerpColors(SkySystem.NIGHT_HORIZON, SkySystem.DAWN_HORIZON, dt);
    } else if (t < 0.4) {
      // Dawn to day
      const dt = (t - 0.3) / 0.1;
      zenith.lerpColors(SkySystem.DAWN_ZENITH, this.biomeSky, dt);
      horizon.lerpColors(SkySystem.DAWN_HORIZON, this.biomeHorizon, dt);
    } else if (t < 0.65) {
      // Full day — use biome colors
      zenith.copy(this.biomeSky);
      horizon.copy(this.biomeHorizon);
    } else if (t < 0.75) {
      // Day to dusk
      const dt = (t - 0.65) / 0.1;
      zenith.lerpColors(this.biomeSky, SkySystem.DUSK_ZENITH, dt);
      horizon.lerpColors(this.biomeHorizon, SkySystem.DUSK_HORIZON, dt);
    } else if (t < 0.85) {
      // Dusk to night
      const dt = (t - 0.75) / 0.1;
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

    // Sun arc
    const sunX = Math.cos(angle) * r * 0.3;
    const sunY = Math.max(Math.sin(angle) * r * 0.5, -50);
    const sunZ = Math.cos(angle) * r * 0.8;
    this.sun.position.set(sunX, sunY, sunZ);
    this.sun.visible = sunY > -10;

    // Moon: opposite the sun
    const moonAngle = angle + Math.PI;
    const moonX = Math.cos(moonAngle) * r * 0.3;
    const moonY = Math.max(Math.sin(moonAngle) * r * 0.5, -50);
    const moonZ = Math.cos(moonAngle) * r * 0.8;
    this.moon.position.set(moonX, moonY, moonZ);
    this.moon.visible = moonY > -10;
  }

  private updateStars(): void {
    const mat = this.stars.material as THREE.PointsMaterial;

    // Stars fade in at night (timeOfDay around 0 / near 1)
    let starOpacity = 0;
    if (this.timeOfDay < 0.2) {
      starOpacity = 1;
    } else if (this.timeOfDay < 0.3) {
      starOpacity = 1 - (this.timeOfDay - 0.2) / 0.1;
    } else if (this.timeOfDay > 0.8) {
      starOpacity = (this.timeOfDay - 0.8) / 0.1;
    }

    // Tunnel influence dims stars
    starOpacity *= this.dayNightInfluence;

    mat.opacity = starOpacity;
    this.stars.visible = starOpacity > 0.01;
  }
}
