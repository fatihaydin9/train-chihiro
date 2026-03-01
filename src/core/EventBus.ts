import type { BlendedBiomeConfig } from '../biome/types';

export interface EventMap {
  'biome:transition-tick': BlendedBiomeConfig;
  'biome:changed': { biome: string };
  'chunk:recycled': { chunkIndex: number };
  'daytime:tick': { timeOfDay: number; isDaytime: boolean };
  'xr:session-started': void;
  'xr:session-ended': void;
  'grab:start': { hand: string; objectId: string };
  'grab:end': { hand: string; objectId: string };
  'interaction:sit': { active: boolean };
  'interaction:lie': { active: boolean };
  'interaction:light-toggle': void;
  'interaction:lantern-toggle': void;
  'train:speed-changed': { fast: boolean };
  'interaction:stove-toggle': void;
  'interaction:teleport': { x: number; y: number; z: number };
  'stove:state': { on: boolean };
}

type Handler<T> = (data: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler<any>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}
