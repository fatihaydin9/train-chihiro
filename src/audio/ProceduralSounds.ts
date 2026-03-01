import type { AudioSystem } from "./AudioSystem";
import type { EventBus } from "../core/EventBus";
import type { Updatable } from "../core/GameLoop";

/**
 * Procedural ambient sounds — realistic train + weather audio.
 * All layers use filtered noise (no raw oscillators) for a warm, natural tone.
 */
export class ProceduralSounds implements Updatable {
  private ctx: AudioContext;
  private masterGain: GainNode;

  // === Train layers ===
  // 1) Low rumble — deep body vibration of the carriage
  private rumbleGain: GainNode;
  private rumbleFilter: BiquadFilterNode;

  // 2) Wheel hum — mid-low continuous hum of steel on rail
  private wheelGain: GainNode;
  private wheelFilter: BiquadFilterNode;

  // 3) High rail hiss — airy high-freq "ssshhh" of speed
  private hissGain: GainNode;
  private hissFilter: BiquadFilterNode;

  // 4) Clack — percussive rail joint hit (ta-dam pattern)
  private clackGain: GainNode;
  private clackTimer = 0;
  private clackInterval = 0.75;

  // Speed state
  private isFastSpeed = false;
  private speedLerp = 0; // 0 = slow, 1 = fast

  // === Rain (multi-layer) ===
  private rainGain: GainNode;
  private rainHighGain: GainNode;
  private rainMidGain: GainNode;
  private rainLowGain: GainNode;
  private rainTargetVol = 0;
  private rainDripTimer = 0;
  private rainDripGain: GainNode;

  // === Wind ===
  private windGain: GainNode;
  private windTargetVol = 0;

  private started = false;

  constructor(
    audioSystem: AudioSystem,
    private eventBus: EventBus,
  ) {
    this.ctx = audioSystem.listener.context;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.35;
    this.masterGain.connect(this.ctx.destination);

    // --- 1) Rumble: brown noise → lowpass 60Hz ---
    this.rumbleGain = this.ctx.createGain();
    this.rumbleGain.gain.value = 0.22;
    this.rumbleGain.connect(this.masterGain);
    this.rumbleFilter = this.ctx.createBiquadFilter();
    this.rumbleFilter.type = "lowpass";
    this.rumbleFilter.frequency.value = 55;
    this.rumbleFilter.connect(this.rumbleGain);

    // --- 2) Wheel hum: brown noise → bandpass 100-250Hz ---
    this.wheelGain = this.ctx.createGain();
    this.wheelGain.gain.value = 0.13;
    this.wheelGain.connect(this.masterGain);
    this.wheelFilter = this.ctx.createBiquadFilter();
    this.wheelFilter.type = "bandpass";
    this.wheelFilter.frequency.value = 140;
    this.wheelFilter.Q.value = 0.8;
    this.wheelFilter.connect(this.wheelGain);

    // --- 3) Rail hiss: pink noise → highpass 2kHz ---
    this.hissGain = this.ctx.createGain();
    this.hissGain.gain.value = 0.04;
    this.hissGain.connect(this.masterGain);
    this.hissFilter = this.ctx.createBiquadFilter();
    this.hissFilter.type = "highpass";
    this.hissFilter.frequency.value = 2500;
    this.hissFilter.connect(this.hissGain);

    // --- 4) Clack: white noise → bandpass 600-1200Hz (percussive) ---
    this.clackGain = this.ctx.createGain();
    this.clackGain.gain.value = 0;
    this.clackGain.connect(this.masterGain);

    // --- Rain ---
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    this.rainGain.connect(this.masterGain);

    this.rainHighGain = this.ctx.createGain();
    this.rainHighGain.gain.value = 0.18;
    this.rainHighGain.connect(this.rainGain);

    this.rainMidGain = this.ctx.createGain();
    this.rainMidGain.gain.value = 0.5;
    this.rainMidGain.connect(this.rainGain);

    this.rainLowGain = this.ctx.createGain();
    this.rainLowGain.gain.value = 0.12;
    this.rainLowGain.connect(this.rainGain);

    this.rainDripGain = this.ctx.createGain();
    this.rainDripGain.gain.value = 1.0;
    this.rainDripGain.connect(this.rainHighGain);

    // --- Wind ---
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    this.windGain.connect(this.masterGain);

    // Listen to weather
    this.eventBus.on("biome:transition-tick", (config) => {
      const wt = config.weatherType;
      const intensity = config.weatherIntensity;

      if (
        wt === "rain" ||
        wt === "storm" ||
        wt === "drizzle" ||
        wt === "hail"
      ) {
        this.rainTargetVol = intensity * 0.1;
      } else {
        this.rainTargetVol = 0;
      }

      if (wt === "blizzard" || wt === "storm") {
        this.windTargetVol = config.windStrength * 0.15;
      } else {
        this.windTargetVol = config.windStrength * 0.04;
      }
    });

    // Listen to speed
    this.eventBus.on("train:speed-changed", (data) => {
      this.isFastSpeed = data.fast;
    });
  }

  private start(): void {
    if (this.started) return;
    this.started = true;

    // Rumble source (brown noise)
    const rumbleSrc = this.createNoise("brown");
    rumbleSrc.connect(this.rumbleFilter);
    rumbleSrc.start();

    // Wheel hum source (brown noise, different buffer)
    const wheelSrc = this.createNoise("brown");
    wheelSrc.connect(this.wheelFilter);
    wheelSrc.start();

    // Rail hiss source (pink noise)
    const hissSrc = this.createNoise("pink");
    hissSrc.connect(this.hissFilter);
    hissSrc.start();

    // Clack source (white noise → bandpass)
    const clackSrc = this.createNoise("white");
    const clackBP = this.ctx.createBiquadFilter();
    clackBP.type = "bandpass";
    clackBP.frequency.value = 900;
    clackBP.Q.value = 1.5;
    clackSrc.connect(clackBP);
    clackBP.connect(this.clackGain);
    clackSrc.start();

    // Rain layers
    const rainHiSrc = this.createNoise("pink");
    const rainHiHP = this.ctx.createBiquadFilter();
    rainHiHP.type = "highpass";
    rainHiHP.frequency.value = 4000;
    const rainHiLP = this.ctx.createBiquadFilter();
    rainHiLP.type = "lowpass";
    rainHiLP.frequency.value = 9000;
    rainHiSrc.connect(rainHiHP);
    rainHiHP.connect(rainHiLP);
    rainHiLP.connect(this.rainDripGain);
    rainHiSrc.start();

    const rainMidSrc = this.createNoise("pink");
    const rainMidHP = this.ctx.createBiquadFilter();
    rainMidHP.type = "highpass";
    rainMidHP.frequency.value = 500;
    const rainMidLP = this.ctx.createBiquadFilter();
    rainMidLP.type = "lowpass";
    rainMidLP.frequency.value = 3000;
    rainMidSrc.connect(rainMidHP);
    rainMidHP.connect(rainMidLP);
    rainMidLP.connect(this.rainMidGain);
    rainMidSrc.start();

    const rainLoSrc = this.createNoise("brown");
    const rainLoLP = this.ctx.createBiquadFilter();
    rainLoLP.type = "lowpass";
    rainLoLP.frequency.value = 200;
    rainLoSrc.connect(rainLoLP);
    rainLoLP.connect(this.rainLowGain);
    rainLoSrc.start();

    // Wind
    const windSrc = this.createNoise("brown");
    const windLP = this.ctx.createBiquadFilter();
    windLP.type = "lowpass";
    windLP.frequency.value = 400;
    windSrc.connect(windLP);
    windLP.connect(this.windGain);
    windSrc.start();
  }

  private createNoise(type: "white" | "pink" | "brown"): AudioBufferSourceNode {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === "pink") {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  update(dt: number): void {
    if (this.ctx.state === "suspended") return;
    if (!this.started) this.start();

    // --- Speed transition ---
    const speedTarget = this.isFastSpeed ? 1 : 0;
    this.speedLerp += (speedTarget - this.speedLerp) * Math.min(dt * 1.5, 1);
    const s = this.speedLerp;

    // Rumble: louder + slightly higher cutoff when fast
    this.rumbleGain.gain.value = 0.22 + s * 0.12;
    this.rumbleFilter.frequency.value = 55 + s * 35;

    // Wheel hum: higher center freq + louder when fast
    this.wheelGain.gain.value = 0.13 + s * 0.08;
    this.wheelFilter.frequency.value = 140 + s * 100;

    // Rail hiss: louder when fast (wind/speed creates more high-freq)
    this.hissGain.gain.value = 0.04 + s * 0.05;
    this.hissFilter.frequency.value = 2500 - s * 600; // let more through

    // Clack interval: shorter when fast
    this.clackInterval = 0.65 - s * 0.25;

    // --- Rail clack: ta-dam, ta-dam ---
    this.clackTimer += dt;
    if (this.clackTimer >= this.clackInterval) {
      this.clackTimer -= this.clackInterval;
      const now = this.ctx.currentTime;
      const vol1 = 0.22 + s * 0.08;
      const vol2 = 0.14 + s * 0.06;
      // First hit
      this.clackGain.gain.setValueAtTime(vol1, now);
      this.clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      // Second hit (softer, 75ms gap)
      this.clackGain.gain.setValueAtTime(vol2, now + 0.075);
      this.clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125);
    }

    // --- Rain volume with hard cutoff ---
    const rainCur = this.rainGain.gain.value;
    if (this.rainTargetVol <= 0 && rainCur < 0.002) {
      this.rainGain.gain.value = 0;
    } else {
      this.rainGain.gain.value =
        rainCur + (this.rainTargetVol - rainCur) * Math.min(dt * 2, 1);
    }

    // Drip modulation
    if (this.rainGain.gain.value > 0.01) {
      this.rainDripTimer += dt;
      const dripMod =
        0.85 +
        0.15 *
          Math.sin(this.rainDripTimer * 12.0) *
          Math.sin(this.rainDripTimer * 7.3 + 1.0);
      this.rainDripGain.gain.value = dripMod;
    }

    // --- Wind volume with hard cutoff ---
    const windCur = this.windGain.gain.value;
    if (this.windTargetVol <= 0 && windCur < 0.002) {
      this.windGain.gain.value = 0;
    } else {
      this.windGain.gain.value =
        windCur + (this.windTargetVol - windCur) * Math.min(dt * 2, 1);
    }
  }
}
