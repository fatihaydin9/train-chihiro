import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

export class ResourceManager {
  private audioLoader = new THREE.AudioLoader();
  private textureLoader = new THREE.TextureLoader();
  private gltfLoader = new GLTFLoader();
  private audioBuffers = new Map<string, AudioBuffer>();
  private textures = new Map<string, THREE.Texture>();
  private models = new Map<string, GLTF>();

  async loadAudio(key: string, url: string): Promise<AudioBuffer> {
    if (this.audioBuffers.has(key)) return this.audioBuffers.get(key)!;
    const buffer = await this.audioLoader.loadAsync(url);
    this.audioBuffers.set(key, buffer);
    return buffer;
  }

  async loadTexture(key: string, url: string): Promise<THREE.Texture> {
    if (this.textures.has(key)) return this.textures.get(key)!;
    const tex = await this.textureLoader.loadAsync(url);
    this.textures.set(key, tex);
    return tex;
  }

  getAudio(key: string): AudioBuffer | undefined {
    return this.audioBuffers.get(key);
  }

  getTexture(key: string): THREE.Texture | undefined {
    return this.textures.get(key);
  }

  async loadAllAudio(entries: [string, string][]): Promise<void> {
    const results = await Promise.allSettled(
      entries.map(([key, url]) => this.loadAudio(key, url)),
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        console.warn('Audio load failed:', r.reason);
      }
    }
  }

  async loadAllTextures(entries: [string, string][]): Promise<void> {
    const results = await Promise.allSettled(
      entries.map(([key, url]) => this.loadTexture(key, url)),
    );
    for (const r of results) {
      if (r.status === 'rejected') {
        console.warn('Texture load failed:', r.reason);
      }
    }
  }

  async loadModel(key: string, url: string): Promise<GLTF> {
    if (this.models.has(key)) return this.models.get(key)!;
    const gltf = await this.gltfLoader.loadAsync(url);
    this.models.set(key, gltf);
    return gltf;
  }

  getModel(key: string): GLTF | undefined {
    return this.models.get(key);
  }
}
