import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';
import type { VRInputManager } from './VRInputManager';
import type { InteractableObject } from '../cabin/InteractableObject';

export class GrabSystem implements Updatable {
  private interactables: InteractableObject[] = [];
  private grabbed: (InteractableObject | null)[] = [null, null];
  private raycaster = new THREE.Raycaster();
  private tempMatrix = new THREE.Matrix4();
  private grabOffset = new THREE.Vector3(0, 0, -0.1);

  constructor(
    private scene: THREE.Scene,
    private input: VRInputManager,
    private eventBus: EventBus,
  ) {
    this.raycaster.near = 0;
    this.raycaster.far = 0.5; // short range — must be close to grab
  }

  addInteractable(obj: InteractableObject): void {
    this.interactables.push(obj);
  }

  update(_dt: number, _elapsed: number): void {
    for (let i = 0; i < this.input.controllers.length; i++) {
      const ctrl = this.input.controllers[i];
      const held = this.grabbed[i];

      if (ctrl.squeezing && !held) {
        this.tryGrab(i, ctrl.grip);
      } else if (!ctrl.squeezing && held) {
        this.release(i, held);
      }
    }
  }

  private tryGrab(handIndex: number, grip: THREE.Group): void {
    this.tempMatrix.identity().extractRotation(grip.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(grip.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

    const meshes = this.interactables
      .filter((o) => !o.isGrabbed)
      .map((o) => o.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object;
      const id = hitMesh.userData.interactableId as string;
      const obj = this.interactables.find((o) => o.id === id);
      if (obj) {
        obj.attachTo(grip, this.grabOffset);
        this.grabbed[handIndex] = obj;
        this.eventBus.emit('grab:start', { hand: handIndex === 0 ? 'left' : 'right', objectId: id });
      }
    }
  }

  private release(handIndex: number, obj: InteractableObject): void {
    const worldPos = new THREE.Vector3();
    obj.mesh.getWorldPosition(worldPos);
    obj.detach(this.scene, worldPos);
    this.grabbed[handIndex] = null;
    this.eventBus.emit('grab:end', { hand: handIndex === 0 ? 'left' : 'right', objectId: obj.id });
  }
}
