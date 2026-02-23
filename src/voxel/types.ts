export interface VoxelCube {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: number; // hex color
}

export interface VoxelDefinition {
  name: string;
  cubes: VoxelCube[];
}

export interface SmoothPart {
  type: 'cone' | 'cylinder' | 'sphere' | 'dodecahedron' | 'icosahedron' | 'torus';
  x: number;
  y: number;
  z: number;
  params: number[]; // cone: [radiusTop, radiusBottom, height, radialSegments], cylinder: [radius, height, radialSegments], sphere: [radius, widthSegments, heightSegments], dodecahedron: [radius, detail], icosahedron: [radius, detail], torus: [radius, tube, radialSegs, tubularSegs]
  color: number;
  scaleX?: number; // non-uniform scale (e.g. flattened spheres, elongated blobs)
  scaleY?: number;
  scaleZ?: number;
}

export interface SmoothModelDefinition {
  name: string;
  parts: SmoothPart[];
}
