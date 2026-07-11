/**
 * Zauq Court Ambient Synthesizer
 * Built entirely using the Web Audio API. No external audio files or dependencies.
 * Mimics a traditional Indian Tanpura drone and organic, metallic Sitar/Rubab string plucks.
 */

export interface RagaConfig {
  id: string;
  name: string;
  hindiName: string;
  timeOfDay: string; // e.g. "Morning (06:00 - 12:00)"
  rootHz: number;
  scaleDegrees: number[];
  noteNames: string[];
  filterFreq: number;
  droneType1: OscillatorType;
  droneType2: OscillatorType;
  droneType3: OscillatorType;
  description: string;
  gradient: string;
  glowColor: string;
}

export const RAGA_PRESETS: RagaConfig[] = [
  {
    id: "ahir_bhairav",
    name: "Morning Ahir Bhairav",
    hindiName: "صبح کا راگ • اہیر بھیرو",
    timeOfDay: "Morning (06:00 - 12:00)",
    rootHz: 138.59, // C#3, bright morning tonic
    scaleDegrees: [1, 1.067, 1.25, 1.333, 1.5, 1.667, 1.778, 2], // Ahir Bhairav
    noteNames: ["Sa", "Re (b)", "Ga", "Ma", "Pa", "Dha", "Ni (b)", "Sa'"],
    filterFreq: 600,
    droneType1: "triangle",
    droneType2: "sawtooth",
    droneType3: "triangle",
    description: "A calming morning raga invoking dawn, spiritual peace, and gentle awakening.",
    gradient: "from-amber-950/40 via-orange-950/20 to-stone-950/80",
    glowColor: "amber"
  },
  {
    id: "bilaval",
    name: "Afternoon Bilaval",
    hindiName: "دوپہر کا راگ • بلاول",
    timeOfDay: "Afternoon (12:00 - 17:00)",
    rootHz: 146.83, // D3, radiant midday tonic
    scaleDegrees: [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875, 2], // Pure Major (Bilaval)
    noteNames: ["Sa", "Re", "Ga", "Ma", "Pa", "Dha", "Ni", "Sa'"],
    filterFreq: 520,
    droneType1: "triangle",
    droneType2: "triangle",
    droneType3: "sine",
    description: "The pure, joyous major scale reflecting full sunlight, brightness, and active energy.",
    gradient: "from-yellow-950/30 via-stone-900/40 to-stone-950/90",
    glowColor: "yellow"
  },
  {
    id: "yaman",
    name: "Evening Yaman",
    hindiName: "شام کا راگ • یمن",
    timeOfDay: "Evening (17:00 - 20:00)",
    rootHz: 130.81, // C3, twilight tonic
    scaleDegrees: [1, 1.125, 1.25, 1.406, 1.5, 1.667, 1.875, 2], // Yaman (with sharp 4th)
    noteNames: ["Sa", "Re", "Ga", "Ma (#)", "Pa", "Dha", "Ni", "Sa'"],
    filterFreq: 420,
    droneType1: "sine",
    droneType2: "triangle",
    droneType3: "triangle",
    description: "A romantic and deeply emotional twilight scale utilizing a sharp perfect fourth, perfect for sunset.",
    gradient: "from-purple-950/40 via-indigo-950/30 to-stone-950/80",
    glowColor: "purple"
  },
  {
    id: "bhairavi",
    name: "Nighttime Bhairavi",
    hindiName: "رات کا راگ • بھیروی",
    timeOfDay: "Night (20:00 - 06:00)",
    rootHz: 110.00, // A2, deep low-frequency midnight drone
    scaleDegrees: [1, 1.067, 1.2, 1.333, 1.5, 1.6, 1.8, 2], // Bhairavi (mystical minor)
    noteNames: ["Sa", "Re (b)", "Ga (b)", "Ma", "Pa", "Dha (b)", "Ni (b)", "Sa'"],
    filterFreq: 330,
    droneType1: "triangle",
    droneType2: "sawtooth",
    droneType3: "triangle",
    description: "A dark, compassionate, and deeply introspective nocturnal raga that encourages peaceful calm.",
    gradient: "from-indigo-950/50 via-stone-950/80 to-black",
    glowColor: "indigo"
  }
];

class CourtAmbientSynth {
  private ctx: AudioContext | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneOsc3: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private isRunning: boolean = false;
  private pluckInterval: NodeJS.Timeout | null = null;

  // Active state properties
  private activeRagaId: string = "bhairavi";
  private rootHz = 110.00; 
  private scaleDegrees = [1, 1.067, 1.2, 1.333, 1.5, 1.6, 1.8, 2]; 

  constructor() {
    // AudioContext will be initialized on-demand upon first play to comply with browser autoplay policies.
    this.detectRagaFromTime();
  }

  private detectRagaFromTime() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      this.activeRagaId = "ahir_bhairav";
    } else if (hour >= 12 && hour < 17) {
      this.activeRagaId = "bilaval";
    } else if (hour >= 17 && hour < 20) {
      this.activeRagaId = "yaman";
    } else {
      this.activeRagaId = "bhairavi";
    }
    const raga = RAGA_PRESETS.find(r => r.id === this.activeRagaId) || RAGA_PRESETS[3];
    this.rootHz = raga.rootHz;
    this.scaleDegrees = raga.scaleDegrees;
  }

  public getActiveRagaId(): string {
    return this.activeRagaId;
  }

  public setRaga(ragaId: string): void {
    const raga = RAGA_PRESETS.find(r => r.id === ragaId);
    if (!raga) return;

    this.activeRagaId = ragaId;
    this.rootHz = raga.rootHz;
    this.scaleDegrees = raga.scaleDegrees;

    if (this.isRunning && this.ctx && this.filter) {
      const now = this.ctx.currentTime;
      // Smoothly transition the lowpass filter frequency
      this.filter.frequency.exponentialRampToValueAtTime(raga.filterFreq, now + 1.2);

      // Smoothly ramp current drone frequencies to the new raga tonic pitches
      if (this.droneOsc1) {
        this.droneOsc1.type = raga.droneType1;
        this.droneOsc1.frequency.exponentialRampToValueAtTime(this.rootHz, now + 1.2);
      }
      if (this.droneOsc2) {
        this.droneOsc2.type = raga.droneType2;
        this.droneOsc2.frequency.exponentialRampToValueAtTime(this.rootHz * 0.75 - 0.4, now + 1.2);
      }
      if (this.droneOsc3) {
        this.droneOsc3.type = raga.droneType3;
        this.droneOsc3.frequency.exponentialRampToValueAtTime(this.rootHz * 0.5 + 0.2, now + 1.2);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Initialize AudioContext
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn("Web Audio API is not supported in this browser.");
        return;
      }
      this.ctx = new AudioCtxClass();

      // Resume context if suspended (required by Chrome/Safari autoprotects)
      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }

      const raga = RAGA_PRESETS.find(r => r.id === this.activeRagaId) || RAGA_PRESETS[3];
      this.rootHz = raga.rootHz;
      this.scaleDegrees = raga.scaleDegrees;

      // Create main nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Warm lowpass filter to make oscillators sound organic and wood-like
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
      this.filter.frequency.setValueAtTime(raga.filterFreq, this.ctx.currentTime);
      this.filter.connect(this.masterGain);

      // Create Tanpura Drone (3 oscillators playing Fundamental, Perfect Fifth, and Octave)
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      this.droneGain.connect(this.filter);

      // Oscillator 1: Fundamental
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = raga.droneType1;
      this.droneOsc1.frequency.setValueAtTime(this.rootHz, this.ctx.currentTime);
      
      // Oscillator 2: Perfect Fifth (slightly detuned for chorus richness)
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = raga.droneType2;
      this.droneOsc2.frequency.setValueAtTime(this.rootHz * 0.75 - 0.4, this.ctx.currentTime);

      // Oscillator 3: Low Fundamental
      this.droneOsc3 = this.ctx.createOscillator();
      this.droneOsc3.type = raga.droneType3;
      this.droneOsc3.frequency.setValueAtTime(this.rootHz * 0.5 + 0.2, this.ctx.currentTime);

      // Connect nodes
      this.droneOsc1.connect(this.droneGain);
      this.droneOsc2.connect(this.droneGain);
      this.droneOsc3.connect(this.droneGain);

      // Start drone oscillators
      this.droneOsc1.start();
      this.droneOsc2.start();
      this.droneOsc3.start();

      // Fade in master volume slowly
      this.masterGain.gain.linearRampToValueAtTime(0.65, this.ctx.currentTime + 1.5);
      
      this.isRunning = true;

      // Start the automated Sitar plucking scheduler
      this.startPluckScheduler();
    } catch (e) {
      console.error("Failed to start Court Ambient Synthesizer:", e);
    }
  }

  public stop(): void {
    if (!this.isRunning) return;

    if (this.pluckInterval) {
      clearInterval(this.pluckInterval);
      this.pluckInterval = null;
    }

    if (this.masterGain && this.ctx) {
      // Fade out slowly to prevent audio clicks
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);

      const ctxToClose = this.ctx;
      const osc1 = this.droneOsc1;
      const osc2 = this.droneOsc2;
      const osc3 = this.droneOsc3;

      setTimeout(() => {
        try {
          osc1?.stop();
          osc2?.stop();
          osc3?.stop();
          ctxToClose.close();
        } catch (err) {
          // ignore already stopped errors
        }
      }, 1100);
    }

    this.isRunning = false;
  }

  public pluckString(frequency: number, strength: number = 0.5): void {
    if (!this.ctx || !this.filter || !this.masterGain) return;

    const pluckCtx = this.ctx;
    const now = pluckCtx.currentTime;

    const pluckGain = pluckCtx.createGain();
    pluckGain.gain.setValueAtTime(0, now);
    pluckGain.connect(this.filter);

    const pluckOsc1 = pluckCtx.createOscillator();
    const pluckOsc2 = pluckCtx.createOscillator();
    
    pluckOsc1.type = "sawtooth";
    pluckOsc2.type = "triangle";

    const detuneVal = (Math.random() - 0.5) * 5; 
    pluckOsc1.frequency.setValueAtTime(frequency, now);
    pluckOsc1.detune.setValueAtTime(detuneVal, now);

    pluckOsc2.frequency.setValueAtTime(frequency * 2.01, now); 
    pluckOsc2.detune.setValueAtTime(-detuneVal, now);

    const jawariFilter = pluckCtx.createBiquadFilter();
    jawariFilter.type = "peaking";
    jawariFilter.frequency.setValueAtTime(frequency * 3, now); 
    jawariFilter.Q.setValueAtTime(4.0, now);
    jawariFilter.gain.setValueAtTime(8, now); 

    pluckOsc1.connect(jawariFilter);
    pluckOsc2.connect(jawariFilter);
    jawariFilter.connect(pluckGain);

    const duration = 1.8 + Math.random() * 1.5; 
    pluckGain.gain.setValueAtTime(0, now);
    pluckGain.gain.linearRampToValueAtTime(0.18 * strength, now + 0.005); 
    pluckGain.gain.exponentialRampToValueAtTime(0.001, now + duration); 

    pluckOsc1.start(now);
    pluckOsc2.start(now);

    pluckOsc1.stop(now + duration + 0.1);
    pluckOsc2.stop(now + duration + 0.1);
  }

  private startPluckScheduler(): void {
    const playRandomPluck = () => {
      if (!this.isRunning) return;

      const degree = this.scaleDegrees[Math.floor(Math.random() * this.scaleDegrees.length)];
      const octaveMultiplier = Math.random() > 0.6 ? 2 : Math.random() > 0.25 ? 1 : 0.5;
      const finalFrequency = this.rootHz * degree * octaveMultiplier;
      const pluckStrength = 0.4 + Math.random() * 0.6;

      this.pluckString(finalFrequency, pluckStrength);

      const nextDelay = 2500 + Math.random() * 4000;
      this.pluckInterval = setTimeout(playRandomPluck, nextDelay);
    };

    this.pluckInterval = setTimeout(playRandomPluck, 1000);
  }

  public playInteractiveNote(scaleIndex: number): void {
    if (!this.isRunning) {
      this.start().then(() => this.triggerNote(scaleIndex));
    } else {
      this.triggerNote(scaleIndex);
    }
  }

  private triggerNote(scaleIndex: number): void {
    const index = Math.max(0, Math.min(scaleIndex, this.scaleDegrees.length - 1));
    const degree = this.scaleDegrees[index];
    const finalFrequency = this.rootHz * 2 * degree; 
    this.pluckString(finalFrequency, 1.0);
  }

  public getActiveState(): boolean {
    return this.isRunning;
  }
}

export const CourtAmbientSynthInstance = new CourtAmbientSynth();
