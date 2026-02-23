import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { VoxelDefinition, SmoothModelDefinition } from './types';

export class VoxelBuilder {
  static build(def: VoxelDefinition): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
    const geometries: THREE.BufferGeometry[] = [];
    const colors: number[] = [];

    for (const cube of def.cubes) {
      const geo = new THREE.BoxGeometry(cube.w, cube.h, cube.d);
      geo.translate(cube.x, cube.y, cube.z);

      // Add vertex colors
      const col = new THREE.Color(cube.color);
      const count = geo.attributes.position.count;
      for (let i = 0; i < count; i++) {
        colors.push(col.r, col.g, col.b);
      }

      geometries.push(geo);
    }

    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      throw new Error(`Failed to merge geometries for ${def.name}`);
    }

    // Apply vertex colors
    merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0 });

    // Dispose temp geometries
    for (const g of geometries) g.dispose();

    return { geometry: merged, material };
  }

  static buildSmooth(def: SmoothModelDefinition): { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial } {
    const geometries: THREE.BufferGeometry[] = [];
    const colors: number[] = [];

    for (const part of def.parts) {
      let geo: THREE.BufferGeometry;

      switch (part.type) {
        case 'cone': {
          const [radiusTop, radiusBottom, height, radialSegments] = part.params;
          geo = new THREE.ConeGeometry(radiusBottom, height, radialSegments, 1, false, 0, Math.PI * 2);
          // ConeGeometry uses radiusBottom as its single radius; we scale top if needed
          if (radiusTop > 0) {
            geo = new THREE.ConeGeometry(radiusBottom, height, radialSegments);
          }
          break;
        }
        case 'cylinder': {
          const [radius, height, radialSegments] = part.params;
          geo = new THREE.CylinderGeometry(radius, radius, height, radialSegments);
          break;
        }
        case 'sphere': {
          const [radius, widthSegments, heightSegments] = part.params;
          geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
          break;
        }
        case 'dodecahedron': {
          const [radius, detail] = part.params;
          geo = new THREE.DodecahedronGeometry(radius, detail ?? 0);
          break;
        }
        case 'icosahedron': {
          const [radius, detail] = part.params;
          geo = new THREE.IcosahedronGeometry(radius, detail ?? 0);
          break;
        }
        case 'torus': {
          const [radius, tube, radialSegs, tubularSegs] = part.params;
          geo = new THREE.TorusGeometry(radius, tube, radialSegs ?? 8, tubularSegs ?? 12);
          break;
        }
      }

      // Apply non-uniform scale before translate
      if (part.scaleX !== undefined || part.scaleY !== undefined || part.scaleZ !== undefined) {
        geo.scale(part.scaleX ?? 1, part.scaleY ?? 1, part.scaleZ ?? 1);
      }

      // Normalize to non-indexed so mergeGeometries works with mixed geometry types
      // (e.g. ConeGeometry is indexed, DodecahedronGeometry is not)
      if (geo.index) {
        const nonIndexed = geo.toNonIndexed();
        geo.dispose();
        geo = nonIndexed;
      }

      geo.translate(part.x, part.y, part.z);

      // Add vertex colors
      const col = new THREE.Color(part.color);
      const count = geo.attributes.position.count;
      for (let i = 0; i < count; i++) {
        colors.push(col.r, col.g, col.b);
      }

      geometries.push(geo);
    }

    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      throw new Error(`Failed to merge smooth geometries for ${def.name}`);
    }

    merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // flatShading: true for faceted low-poly look on organic shapes
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0, flatShading: true });

    for (const g of geometries) g.dispose();

    return { geometry: merged, material };
  }
}
