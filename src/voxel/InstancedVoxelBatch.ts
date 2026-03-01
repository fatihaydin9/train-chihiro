import * as THREE from "three";

export class InstancedVoxelBatch {
  readonly mesh: THREE.InstancedMesh;

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number,
  ) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false; // chunks manage their own visibility
  }

  setTransform(index: number, matrix: THREE.Matrix4): void {
    this.mesh.setMatrixAt(index, matrix);
  }

  flush(): void {
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
