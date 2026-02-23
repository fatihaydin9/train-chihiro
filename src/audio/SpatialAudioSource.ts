import * as THREE from 'three';
import type { AudioSystem } from './AudioSystem';

export class SpatialAudioSource {
  readonly sound: THREE.PositionalAudio;

  constructor(
    audioSystem: AudioSystem,
    parent: THREE.Object3D,
    buffer: AudioBuffer | undefined,
    options: { refDistance?: number; loop?: boolean; volume?: number } = {},
  ) {
    this.sound = new THREE.PositionalAudio(audioSystem.listener);
    this.sound.setRefDistance(options.refDistance ?? 2);
    this.sound.setLoop(options.loop ?? true);
    this.sound.setVolume(options.volume ?? 0.5);

    if (buffer) {
      this.sound.setBuffer(buffer);
      this.sound.play();
    }

    parent.add(this.sound);
  }

  setBuffer(buffer: AudioBuffer): void {
    if (this.sound.isPlaying) this.sound.stop();
    this.sound.setBuffer(buffer);
    this.sound.play();
  }

  dispose(): void {
    if (this.sound.isPlaying) this.sound.stop();
    this.sound.disconnect();
  }
}
