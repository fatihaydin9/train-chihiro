# Endless Train

A WebXR experience where you sit inside a locomotive cabin and watch procedurally generated landscapes roll by. Built with Three.js and TypeScript. Works on desktop browsers and VR headsets.

![Screenshot](src/example/exp.png)

## What is this

You're riding a train that never stops. Outside the window, biomes change — snowy forests, autumn villages, ocean crossings in a storm, dark tunnels with neon lights, construction sites. The terrain is generated on the fly using noise functions, so the ride never repeats. Weather shifts between rain, snow, blizzards, and clear skies. Day turns to night and back again.

Inside the cabin there's a control dashboard, a bed, a small kitchen, and a lantern you can toggle. In VR you can grab the coffee mug or the logbook on the nightstand.

## How terrain works

The world is an infinite treadmill. Eight chunks of terrain (each 40m deep, 80m wide) sit in a pool. As the train moves forward, the chunk that falls behind gets recycled to the front with a new terrain configuration.

Terrain height is generated with **2D Simplex noise** layered through **Fractal Brownian Motion** (FBM). Three octaves of noise are stacked — each octave doubles the frequency and halves the amplitude — which gives the terrain a natural mix of broad hills and fine detail. The noise is seeded (seed 42), so terrain generation is deterministic but looks organic.

```
height = fbm(simplex2D, x * freq, z * freq, octaves=3, lacunarity=2.0, persistence=0.5)
```

A sine-based clearance profile keeps the area around the tracks flat, so the train doesn't clip through hills. The amplitude scales per-biome — polar regions get tall ridges, ocean biome stays nearly flat.

Ground color is also noise-driven. Two ground colors from the current biome are blended based on a separate noise sample, giving the terrain a patchy, natural look instead of a single flat color.

## Biome system

There are 16 biomes that cycle in a fixed order:

spring meadow → village → autumn forest → amazon → thunderstorm → suburban → ocean → wilderness → cave → tunnel → industrial → construction → dark city → frozen waste → polar → arctic coast

Each biome defines its own fog, sky colors, lighting, ground palette, flora types, weather, and terrain amplitude. Transitions between biomes take about 15 seconds — every parameter (colors, fog distance, light intensity, terrain height) gets smoothly interpolated frame by frame using a `BiomeLerper`. No hard cuts.

## Flora and voxel models

Trees, rocks, buildings, and other objects are built from voxel-style geometry — combinations of boxes, cylinders, cones, and spheres. Each biome specifies what models to spawn and how many, split into near-field (5–15m from the track) and far-field (15–38m). Models are rendered with instanced meshes for performance.

Some examples: `pine_snow` is a cylinder trunk with stacked cones and snow caps. `city_building_small` is a stack of colored boxes with window holes. `lighthouse` is a tapered cylinder with an emissive top.

## Weather

12 weather types: snow, rain, blizzard, storm, drizzle, frost, leaves, ash, petals, hail, smog, sandstorm. Each type is a particle system with its own count, size, speed, color, and drift parameters. Storm mode throws 18,000 particles at high speed. Snow drifts gently at 2 m/s.

When biomes transition, the weather crossfades — old particles fade out while new ones fade in.

Lightning in storm biomes uses a multi-phase flash sequence (initial flash → brief dark → main flash → sustain → slow decay) instead of a simple on/off blink. Occasionally a third re-flash fires for extra realism.

## Day/night cycle

A full day takes 8 minutes. Dawn starts around 20% through the cycle, dusk ends around 80%. Transitions use smoothstep easing so sunrise and sunset feel gradual, not abrupt.

The sun follows an arc across the sky with power-eased sine movement — it rises slowly, lingers near the top, and sets slowly. Stars fade in during dusk and out during dawn. Polar biomes get aurora borealis at night.

Lighting, sky gradient, fog color, and ambient intensity all respond to the time of day.

## The cabin

The interior is a 3m × 3m × 6m space. Front half has the driving console with levers, gauges, and buttons. Back half has a bed, nightstand with a lantern, and a small kitchen counter with a stove.

Windows use a shader overlay that adds frost patterns in cold biomes and rain streaks during storms.

All audio is procedurally generated — no sample files. Train sounds come from layered noise generators: brown noise through a lowpass for the rumble, bandpass-filtered noise for the wheel hum, highpass noise for the rail hiss, and a periodic burst for the rail joint clack. Rain is three layers of filtered noise plus periodic drip sounds. Wind is shaped pink noise.

## Running it

```bash
npm install
npm run dev
```

Opens at `https://localhost:5173`. HTTPS is required for WebXR. Use mouse to look around on desktop, or connect a VR headset.

## Stack

- **Three.js** — rendering, scene graph, shaders
- **TypeScript** — all source code
- **Vite** — dev server and bundler
- **Web Audio API** — procedural sound synthesis
- **WebXR** — VR headset support
