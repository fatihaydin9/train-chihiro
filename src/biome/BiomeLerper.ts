import type { BiomeConfig, BlendedBiomeConfig, BiomeColorConfig } from './types';
import { lerp, smoothstep } from '../utils/math';

export class BiomeLerper {
  blend(from: BiomeConfig, to: BiomeConfig, t: number): BlendedBiomeConfig {
    const s = smoothstep(0, 1, t);
    // Booleans snap at t=0.5
    const snap = t < 0.5;
    return {
      name: snap ? from.name : to.name,
      fogColor: this.lerpRGB(from.fogColor, to.fogColor, s),
      fogNear: lerp(from.fogNear, to.fogNear, s),
      fogFar: lerp(from.fogFar, to.fogFar, s),
      skyColor: this.lerpRGB(from.skyColor, to.skyColor, s),
      skyColorHorizon: this.lerpRGB(from.skyColorHorizon, to.skyColorHorizon, s),
      ambientColor: this.lerpRGB(from.ambientColor, to.ambientColor, s),
      ambientIntensity: lerp(from.ambientIntensity, to.ambientIntensity, s),
      directionalColor: this.lerpRGB(from.directionalColor, to.directionalColor, s),
      directionalIntensity: lerp(from.directionalIntensity, to.directionalIntensity, s),
      groundColor: this.lerpRGB(from.groundColor, to.groundColor, s),
      groundColorAlt: this.lerpRGB(from.groundColorAlt, to.groundColorAlt, s),
      trackColor: this.lerpRGB(from.trackColor, to.trackColor, s),
      floraTypes: snap ? from.floraTypes : to.floraTypes,
      floraDistribution: snap ? from.floraDistribution : to.floraDistribution,
      distantModels: snap ? from.distantModels : to.distantModels,
      terrainAmplitude: lerp(from.terrainAmplitude, to.terrainAmplitude, s),
      weatherType: snap ? from.weatherType : to.weatherType,
      weatherIntensity: lerp(from.weatherIntensity, to.weatherIntensity, s),
      windStrength: lerp(from.windStrength, to.windStrength, s),

      // Booleans snap at midpoint
      isTunnel: snap ? from.isTunnel : to.isTunnel,
      tunnelWallColor: this.lerpRGB(from.tunnelWallColor, to.tunnelWallColor, s),
      hasNeonLights: snap ? from.hasNeonLights : to.hasNeonLights,
      neonColors: snap ? from.neonColors : to.neonColors,

      // Numeric fields lerp
      riverProbability: lerp(from.riverProbability, to.riverProbability, s),
      structureDensity: lerp(from.structureDensity, to.structureDensity, s),
      dayNightInfluence: lerp(from.dayNightInfluence, to.dayNightInfluence, s),

      transitionProgress: t,
      fromBiome: from.name,
      toBiome: to.name,
    };
  }

  private lerpRGB(a: BiomeColorConfig, b: BiomeColorConfig, t: number): BiomeColorConfig {
    return {
      r: lerp(a.r, b.r, t),
      g: lerp(a.g, b.g, t),
      b: lerp(a.b, b.b, t),
    };
  }
}
