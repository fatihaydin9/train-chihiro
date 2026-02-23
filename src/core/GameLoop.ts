import type { Engine } from './Engine';

export interface Updatable {
  update(dt: number, elapsed: number): void;
}

export class GameLoop {
  private systems: Updatable[] = [];
  private clock = { elapsed: 0 };

  constructor(private engine: Engine) {}

  addSystem(system: Updatable): void {
    this.systems.push(system);
  }

  start(): void {
    this.engine.renderer.setAnimationLoop((_time, frame) => {
      // Compute delta — XR frame has its own timing
      const dt = Math.min(frame ? 1 / 72 : 1 / 60, 0.05); // cap at 50ms
      this.clock.elapsed += dt;

      for (const system of this.systems) {
        system.update(dt, this.clock.elapsed);
      }

      this.engine.renderer.render(this.engine.scene, this.engine.camera);
    });
  }
}
