import * as THREE from 'three';
import type { VRInputManager } from './VRInputManager';

export class ControllerModel {
  constructor(input: VRInputManager, scene: THREE.Scene) {
    const geo = new THREE.BoxGeometry(0.04, 0.04, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.5 });

    for (const ctrl of input.controllers) {
      const mesh = new THREE.Mesh(geo, mat);
      ctrl.grip.add(mesh);
    }
  }
}
