import * as THREE from 'three';
import type { Updatable } from '../core/GameLoop';
import type { EventBus } from '../core/EventBus';

export interface ControllerState {
  grip: THREE.Group;
  ray: THREE.Group;
  gamepad: Gamepad | null;
  squeezing: boolean;
  selecting: boolean;
}

export class VRInputManager implements Updatable {
  readonly controllers: ControllerState[] = [];

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private eventBus: EventBus,
  ) {
    for (let i = 0; i < 2; i++) {
      const grip = this.renderer.xr.getControllerGrip(i);
      const ray = this.renderer.xr.getController(i);

      scene.add(grip);
      scene.add(ray);

      const state: ControllerState = {
        grip,
        ray,
        gamepad: null,
        squeezing: false,
        selecting: false,
      };
      this.controllers.push(state);

      ray.addEventListener('selectstart', () => {
        state.selecting = true;
      });
      ray.addEventListener('selectend', () => {
        state.selecting = false;
      });
      ray.addEventListener('squeezestart', () => {
        state.squeezing = true;
      });
      ray.addEventListener('squeezeend', () => {
        state.squeezing = false;
      });
    }

    this.renderer.xr.addEventListener('sessionstart', () => {
      this.eventBus.emit('xr:session-started', undefined as any);
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.eventBus.emit('xr:session-ended', undefined as any);
    });
  }

  update(_dt: number, _elapsed: number): void {
    const session = this.renderer.xr.getSession();
    if (!session) return;

    for (let i = 0; i < this.controllers.length; i++) {
      const source = session.inputSources[i];
      if (source) {
        this.controllers[i].gamepad = source.gamepad ?? null;
      }
    }
  }
}
