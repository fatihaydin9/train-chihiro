import * as THREE from 'three';
import { Engine } from './core/Engine';
import { GameLoop } from './core/GameLoop';
import { EventBus } from './core/EventBus';
import { ResourceManager } from './core/ResourceManager';
import { VoxelRegistry } from './voxel/VoxelRegistry';
import { TreadmillSystem } from './treadmill/TreadmillSystem';
import { BiomeController } from './biome/BiomeController';
import { FogSystem } from './environment/FogSystem';
import { LightingSystem } from './environment/LightingSystem';
import { SkySystem } from './environment/SkySystem';
import { DayNightCycle } from './environment/DayNightCycle';
import { WeatherSystem } from './weather/WeatherSystem';
import { CabinSetup } from './cabin/CabinSetup';
import { TrainBodyAhead } from './cabin/TrainBodyAhead';
import { TrainMotion } from './cabin/TrainMotion';
import { StoveLight } from './cabin/StoveLight';
import { WindowEffects } from './cabin/WindowEffects';
import { InteractableObject } from './cabin/InteractableObject';
import { VRInputManager } from './interaction/VRInputManager';
import { GrabSystem } from './interaction/GrabSystem';
import { ControllerModel } from './interaction/ControllerModel';
import { AudioSystem } from './audio/AudioSystem';
import { AudioCrossfader } from './audio/AudioCrossfader';
import { ProceduralSounds } from './audio/ProceduralSounds';
import { DistantScenery } from './treadmill/DistantScenery';
import { BirdFlock } from './environment/BirdFlock';
import { WaterSurface } from './environment/WaterSurface';
import { WaterWake } from './environment/WaterWake';
import { DesktopCameraController } from './interaction/DesktopCameraController';
import { CabinInteraction } from './cabin/CabinInteraction';
import { CABIN_FLOOR_Y, CABIN_WIDTH, CABIN_DEPTH } from './utils/constants';

export class App {
  private engine: Engine;
  private loop: GameLoop;
  private eventBus: EventBus;
  private resources: ResourceManager;

  constructor() {
    this.engine = new Engine();
    this.eventBus = new EventBus();
    this.resources = new ResourceManager();
    this.loop = new GameLoop(this.engine);
  }

  async init(): Promise<void> {
    const { scene, camera, renderer } = this.engine;

    // --- Voxel Registry (build all models at startup) ---
    const registry = new VoxelRegistry();

    // --- Day/Night Cycle (runs before environment) ---
    const dayNightCycle = new DayNightCycle(this.eventBus);
    this.loop.addSystem(dayNightCycle);

    // --- Biome Controller (drives all transitions) ---
    const biomeController = new BiomeController(this.eventBus);
    this.loop.addSystem(biomeController);

    // --- Environment ---
    const fogSystem = new FogSystem(scene, this.eventBus);
    const lightingSystem = new LightingSystem(scene, this.eventBus);
    const skySystem = new SkySystem(scene, this.eventBus);
    this.loop.addSystem(fogSystem);
    this.loop.addSystem(lightingSystem);
    this.loop.addSystem(skySystem);

    // --- Treadmill ---
    const treadmill = new TreadmillSystem(scene, this.eventBus, registry);
    this.loop.addSystem(treadmill);

    // --- Distant Scenery (parallax mountains, villages) ---
    const distantScenery = new DistantScenery(scene, this.eventBus, registry);
    this.loop.addSystem(distantScenery);

    // --- Birds (cinematic flocks) ---
    const birds = new BirdFlock(scene);
    this.loop.addSystem(birds);

    // --- Water Surface (ocean biome animated plane) ---
    const waterSurface = new WaterSurface(scene, this.eventBus);
    waterSurface.setCamera(camera);
    this.loop.addSystem(waterSurface);

    // --- Water Wake (foam trail around train) ---
    const waterWake = new WaterWake(scene, this.eventBus);
    this.loop.addSystem(waterWake);

    // --- Weather ---
    const weather = new WeatherSystem(scene, this.eventBus, camera);
    this.loop.addSystem(weather);

    // --- Train Cabin (windshield faces -Z, travel direction) ---
    const cabin = new CabinSetup();
    scene.add(cabin.group);

    // --- Train Cars Ahead (extend in -Z, visible through windshield) ---
    const trainBody = new TrainBodyAhead();
    scene.add(trainBody.group);

    const stoveLight = new StoveLight(scene, this.eventBus);
    this.loop.addSystem(stoveLight);

    // --- Window Effects (frost, fog, rain drops on glass) ---
    const windowEffects = new WindowEffects(scene, this.eventBus);
    this.loop.addSystem(windowEffects);

    // --- Train Motion (camera rig vibration/sway) ---
    const trainMotion = new TrainMotion(this.engine.cameraRig);
    this.loop.addSystem(trainMotion);

    // --- Desktop Camera Controller (non-VR mouse+keyboard) ---
    const desktopCam = new DesktopCameraController(camera, renderer, this.eventBus);
    this.loop.addSystem(desktopCam);

    // --- Cabin Interactions (sit, lie, light toggle + hover tooltips) ---
    const cabinInteraction = new CabinInteraction(camera, this.eventBus);
    this.loop.addSystem(cabinInteraction);

    // --- Interactable objects (positioned for new 3×3×6m cabin) ---
    const floorTop = CABIN_FLOOR_Y + 0.06; // floor surface
    const halfW = CABIN_WIDTH / 2;
    const halfD = CABIN_DEPTH / 2;
    const deskY = CABIN_FLOOR_Y + 0.8;

    // Coffee mug on control desk (desk is near -Z front wall)
    const coffeeMug = new InteractableObject(
      'coffee_mug',
      new THREE.CylinderGeometry(0.04, 0.035, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x885533, roughness: 0.8, metalness: 0.0 }),
      new THREE.Vector3(-0.6, deskY + 0.08, -halfD + 0.35),
    );
    scene.add(coffeeMug.mesh);

    // Logbook on nightstand (living area, beside bed)
    const nsX = halfW - 0.12 - 0.39 - 0.78 / 2 - 0.2; // nightstand X
    const nsTopY = CABIN_FLOOR_Y + 0.06 + 0.4 + 0.02;  // nightstand top surface
    const logbook = new InteractableObject(
      'logbook',
      new THREE.BoxGeometry(0.15, 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x554422, roughness: 0.9, metalness: 0.0 }),
      new THREE.Vector3(nsX, nsTopY, 0.3 + 0.15),
    );
    scene.add(logbook.mesh);

    // --- VR Interaction ---
    const vrInput = new VRInputManager(renderer, scene, this.eventBus);
    this.loop.addSystem(vrInput);

    const grabSystem = new GrabSystem(scene, vrInput, this.eventBus);
    grabSystem.addInteractable(coffeeMug);
    grabSystem.addInteractable(logbook);
    this.loop.addSystem(grabSystem);

    new ControllerModel(vrInput, scene);

    // --- Audio ---
    const audioSystem = new AudioSystem(camera);
    const crossfader = new AudioCrossfader(audioSystem, this.resources, this.eventBus);
    this.loop.addSystem(crossfader);

    const proceduralSounds = new ProceduralSounds(audioSystem, this.eventBus);
    this.loop.addSystem(proceduralSounds);

    // Resume audio context on user gesture
    const resumeAudio = () => {
      audioSystem.resume();
      document.removeEventListener('click', resumeAudio);
    };
    document.addEventListener('click', resumeAudio);

    // --- Start ---
    this.loop.start();
  }
}
