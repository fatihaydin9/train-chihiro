# PROJECT SPECIFICATION (SPEC.md) - Update 1: Dynamic Climates
**Project Name:** North Express
**Platform:** WebXR (Optimized for Meta Quest Browser)
**Genre:** VR Cozy / Chrysalism Experience / Sandbox
**Visual Style:** Voxel Art (Soft-lit, peaceful Bob Ross vibe with changing seasons)

## 1. Project Overview & Vibe
This project aims to give the player the psychological feeling of "Chrysalism" — the tranquil feeling of being indoors, warm, and safe while the outside world undergoes dynamic weather and climate changes. The player is on an endless train journey. Inside the train is nostalgic, warm, and secure. Outside, the environment seamlessly transitions between different biomes (e.g., harsh winter blizzards, rainy autumn forests, misty spring valleys).

## 3. Core Mechanics (Phase 1)
* **The Treadmill Illusion (Endless Runner):** To prevent motion sickness in VR, the player and the train cabin remain static at (X:0, Y:0, Z:0). The external voxel world moves along the Z-axis towards the player and resets behind them.
* **Dynamic Biome & Climate System:** The treadmill generator will use procedural logic to smoothly transition between different environments. It will swap voxel tree models (e.g., snowy pines to leafy oaks) and interpolate terrain colors.
* **Physics-Based Interaction:** Using VR controllers, the player can grab and move physical objects inside the cabin (chestnuts, coffee pot, etc.).

## 4. Environment & Scene Design
* **Exterior (Procedural Changing Biomes):**
    * **Vegetation & Terrain:** Voxel flora changes dynamically based on the current active biome (Winter: bare/snowy pines; Autumn: orange/red oaks; Spring: green trees and flowers). [Image of procedural biome transitions in voxel environments]
    * **Weather Particles:** A dynamic particle system that smoothly transitions between heavy snow, falling rain, or drifting autumn leaves.
    * **Atmosphere:** The background fog (`scene.fog`) will smoothly interpolate its color and density (e.g., cold blue for winter, warm amber for autumn, grey for heavy rain).

## 5. Lighting & Shadows (Crucial for Atmosphere)
* **Exterior Light:** The Ambient Light and Directional Light will shift colors smoothly to match the current biome's mood (e.g., bright white/blue for winter, golden hour orange for autumn).
* **Interior Light:** A warm, flickering orange/yellow Point Light emitting from the stove, remaining constant to anchor the feeling of safety.

## 6. Audio Experience (Phase 1 Targets)
* **Dynamic Weather Audio:** The sound of the weather hitting the glass will crossfade depending on the biome (muffled snow winds -> heavy rain drops -> gentle spring breeze).
* Rhythmic train wheel clatter in the background ("click-clack").
* Spatial audio of wood crackling from the interior stove.