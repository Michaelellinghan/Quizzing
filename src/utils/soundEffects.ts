/**
 * QuizCast Live Sound Engine
 * Procedural Web Audio API sound synthesizer for authentic game show audio effects.
 * Zero external audio dependencies, low-latency, and cross-device compatible.
 */

export type SoundEffectType =
  | 'buzzer'
  | 'ding'
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'fanfare'
  | 'unlock'
  | 'whoosh';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted: boolean = false;
  private volume: number = 0.8;
  private isUnlocked: boolean = false;
  private unlockListeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup unlock triggers on first user interaction
      const unlockAudio = () => {
        this.resume();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  public async resume(): Promise<boolean> {
    this.initCtx();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    if (this.ctx.state === 'running') {
      this.isUnlocked = true;
      this.unlockListeners.forEach(cb => cb());
      return true;
    }
    return false;
  }

  public onUnlock(callback: () => void) {
    this.unlockListeners.push(callback);
    if (this.isUnlocked) callback();
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked || (this.ctx?.state === 'running');
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.muted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Main play entry point for sound effects
   */
  public play(soundName: SoundEffectType | string) {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.masterGain) return;

      // Ensure resumed
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      switch (soundName) {
        case 'buzzer':
          this.playBuzzer();
          break;
        case 'ding':
          this.playDing();
          break;
        case 'correct':
          this.playCorrect();
          break;
        case 'wrong':
          this.playWrong();
          break;
        case 'tick':
          this.playTick();
          break;
        case 'fanfare':
          this.playFanfare();
          break;
        case 'unlock':
          this.playUnlock();
          break;
        case 'whoosh':
          this.playWhoosh();
          break;
        default:
          this.playDing();
          break;
      }
    } catch (e) {
      console.warn('Sound play prevented or audio blocked:', e);
    }
  }

  /**
   * 1. BUZZER SOUND
   * Classic gameshow electric buzzer with dual detuned sawtooth/square wave
   * and low-pass filter envelope for punchy, authentic response.
   */
  private playBuzzer() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    // 145Hz fundamental with 6Hz beating for classic buzzer grit
    osc1.frequency.setValueAtTime(145, now);
    osc2.frequency.setValueAtTime(151, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.45);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.setValueAtTime(0.4, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.52);
    osc2.stop(now + 0.52);
  }

  /**
   * 2. DING / BELL SOUND
   * Crisp, metallic bell chime with fundamental (A5 ~880Hz) and distinct
   * inharmonic overtone (2.76x fundamental) creating an authentic game bell.
   */
  private playDing() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const fundamental = 880; // A5
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(fundamental, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(fundamental * 2.76, now); // Metallic chime partial

    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    gain2.gain.setValueAtTime(0.18, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.75);
    osc2.stop(now + 0.75);
  }

  /**
   * 3. CORRECT ANSWER CHIME
   * Shimmering, ascending 4-note major arpeggio (C5 -> E5 -> G5 -> C6)
   * with crystalline sparkle that signals a correct answer and points awarded.
   */
  private playCorrect() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.00 }, // C5
      { f: 659.25, t: 0.09 }, // E5
      { f: 783.99, t: 0.18 }, // G5
      { f: 1046.5, t: 0.27 }  // C6 (high apex)
    ];

    notes.forEach((note) => {
      const startTime = now + note.t;
      const osc = this.ctx!.createOscillator();
      const overtone = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, startTime);

      overtone.type = 'sine';
      overtone.frequency.setValueAtTime(note.f * 2, startTime);

      gain.gain.setValueAtTime(0.28, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + 0.48);
      overtone.stop(startTime + 0.48);
    });
  }

  /**
   * 4. WRONG ANSWER BUZZER
   * Classic gameshow descending dissonant two-tone buzz (F#3 / C3 tritone)
   * with harsh raspy texture that leaves no doubt the answer was rejected.
   */
  private playWrong() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // First downward low buzz
    this.createDissonantBuzz(now, 185, 120, 0.25);
    // Second trailing lower buzz
    this.createDissonantBuzz(now + 0.22, 140, 85, 0.35);
  }

  private createDissonantBuzz(start: number, f1: number, f2: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';

    // Dissonant interval
    osc1.frequency.setValueAtTime(f1, start);
    osc1.frequency.linearRampToValueAtTime(f2, start + duration);

    osc2.frequency.setValueAtTime(f1 * 1.414, start); // Tritone interval
    osc2.frequency.linearRampToValueAtTime(f2 * 1.414, start + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, start);
    filter.frequency.exponentialRampToValueAtTime(400, start + duration);

    gain.gain.setValueAtTime(0.38, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(start);
    osc2.start(start);
    osc1.stop(start + duration + 0.05);
    osc2.stop(start + duration + 0.05);
  }

  /**
   * 5. TIMER TICK
   * High-contrast mechanical clock tick for countdown tension.
   */
  private playTick() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(5, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  /**
   * 6. UNLOCK BUZZER CHIRP
   * Rapid ascending double-chirp indicating buzzers and inputs are now open!
   */
  private playUnlock() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const notes = [
      { f: 587.33, t: 0.00 }, // D5
      { f: 880.00, t: 0.08 }  // A5
    ];

    notes.forEach((note) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const start = now + note.t;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, start);
      osc.frequency.exponentialRampToValueAtTime(note.f * 1.3, start + 0.1);

      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(start);
      osc.stop(start + 0.16);
    });
  }

  /**
   * 7. VICTORY FANFARE
   * Grand gameshow celebratory brass fanfare (G -> A -> C major chords)
   */
  private playFanfare() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const chords = [
      { t: 0.00, freqs: [392.00, 493.88, 587.33], dur: 0.22 },     // G major
      { t: 0.22, freqs: [440.00, 554.37, 659.25], dur: 0.22 },     // A major
      { t: 0.45, freqs: [523.25, 659.25, 783.99, 1046.5], dur: 0.8 } // C major triumphant
    ];

    chords.forEach((chord) => {
      chord.freqs.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = now + chord.t;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + chord.dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(start);
        osc.stop(start + chord.dur + 0.05);
      });
    });
  }

  /**
   * 8. TRANSITION SWOOSH
   * Bandpass noise sweep for category / round changes
   */
  private playWhoosh() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(1800, now + 0.15);
    filter.frequency.linearRampToValueAtTime(300, now + 0.3);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

export const soundEffects = new SoundEngine();
