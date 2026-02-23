import * as THREE from 'three';
import type { AudioSystem } from './AudioSystem';

export class AmbientAudioLayer {
  readonly sound: THREE.Audio;

  constructor(
    audioSystem: AudioSystem,
    buffer: AudioBuffer | undefined,
    options: { loop?: boolean; volume?: number } = {},
  ) {
    this.sound = new THREE.Audio(audioSystem.listener);
    this.sound.setLoop(options.loop ?? true);
    this.sound.setVolume(options.volume ?? 0.3);

    if (buffer) {
      this.sound.setBuffer(buffer);
      this.sound.play();
    }
  }

  setBuffer(buffer: AudioBuffer): void {
    if (this.sound.isPlaying) this.sound.stop();
    this.sound.setBuffer(buffer);
    this.sound.play();
  }

  setVolume(vol: number): void {
    this.sound.setVolume(vol);
  }

  dispose(): void {
    if (this.sound.isPlaying) this.sound.stop();
    this.sound.disconnect();
  }
}
