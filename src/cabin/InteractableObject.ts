import * as THREE from 'three';

export class InteractableObject {
  readonly mesh: THREE.Mesh;
  readonly id: string;
  isGrabbed = false;

  constructor(
    id: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: THREE.Vector3,
  ) {
    this.id = id;
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.userData.interactableId = id;
  }

  attachTo(parent: THREE.Object3D, localOffset: THREE.Vector3): void {
    this.isGrabbed = true;
    parent.add(this.mesh);
    this.mesh.position.copy(localOffset);
    this.mesh.quaternion.identity();
  }

  detach(scene: THREE.Scene, worldPosition: THREE.Vector3): void {
    this.isGrabbed = false;
    this.mesh.parent?.remove(this.mesh);
    scene.add(this.mesh);
    this.mesh.position.copy(worldPosition);
  }
}
