import * as THREE from 'three';

export class AudioSystem {
  readonly listener: THREE.AudioListener;
  private masterGain: GainNode | null = null;

  constructor(camera: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);

    // Master gain control
    if (this.listener.context) {
      this.masterGain = this.listener.context.createGain();
      this.masterGain.connect(this.listener.context.destination);
      this.masterGain.gain.value = 0.8;
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = volume;
    }
  }

  resume(): void {
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume();
    }
  }
}
