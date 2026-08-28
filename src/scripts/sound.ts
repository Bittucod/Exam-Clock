// Web Audio API Synthesizer for offline, professional alarms

export type AlarmSoundKey = 'classic' | 'digital' | 'school-bell' | 'emergency' | 'gentle-gong' | 'triple-fanfare';

class SoundManager {
  private isMuted: boolean = false;
  private volume: number = 0.5; // 0 to 1
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Lazy initialize to avoid browser policies blocking audio context on load
  }

  private initCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  getMute(): boolean {
    return this.isMuted;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  getVolume(): number {
    return this.volume;
  }

  // Play a single clean beep tone
  playBeep(frequency = 587.33, duration = 0.25, type: OscillatorType = 'sine', delaySec = 0) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + delaySec);

      gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime + delaySec);
      // Exponential decay for soft ending
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + delaySec + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + delaySec);
      osc.stop(ctx.currentTime + delaySec + duration);
    } catch (err) {
      console.warn("Audio play blocked or unsupported by browser:", err);
    }
  }

  // Helper: play a sequence of notes
  private playNoteSequence(notes: { freq: number; time: number; dur: number; type?: OscillatorType }[]) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = note.type || 'sine';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

        gain.gain.setValueAtTime(0.0, ctx.currentTime + note.time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.18, ctx.currentTime + note.time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + note.time + note.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + note.time);
        osc.stop(ctx.currentTime + note.time + note.dur);
      });
    } catch (err) {
      console.warn("Note sequence failed to play:", err);
    }
  }

  // 1. Classic Chime — Elegant Ding-Dong (E5 → B4)
  private playClassicChime() {
    this.playNoteSequence([
      { freq: 659.25, time: 0.0, dur: 0.4 },
      { freq: 493.88, time: 0.25, dur: 0.6 }
    ]);
  }

  // 2. Digital Beeps — Rapid staccato electronic beeps (5 fast beeps)
  private playDigitalBeeps() {
    this.playNoteSequence([
      { freq: 1000, time: 0.0, dur: 0.08, type: 'square' },
      { freq: 1000, time: 0.15, dur: 0.08, type: 'square' },
      { freq: 1000, time: 0.30, dur: 0.08, type: 'square' },
      { freq: 1200, time: 0.50, dur: 0.08, type: 'square' },
      { freq: 1200, time: 0.65, dur: 0.15, type: 'square' }
    ]);
  }

  // 3. School Bell — Two-tone alternating bell pattern
  private playSchoolBell() {
    this.playNoteSequence([
      { freq: 830.61, time: 0.0, dur: 0.3, type: 'triangle' },
      { freq: 622.25, time: 0.3, dur: 0.3, type: 'triangle' },
      { freq: 830.61, time: 0.6, dur: 0.3, type: 'triangle' },
      { freq: 622.25, time: 0.9, dur: 0.5, type: 'triangle' }
    ]);
  }

  // 4. Emergency — Urgent ascending alert (C5→E5→G5→C6)
  private playEmergencyAlert() {
    this.playNoteSequence([
      { freq: 523.25, time: 0.0, dur: 0.15, type: 'sawtooth' },
      { freq: 659.25, time: 0.18, dur: 0.15, type: 'sawtooth' },
      { freq: 783.99, time: 0.36, dur: 0.15, type: 'sawtooth' },
      { freq: 1046.50, time: 0.54, dur: 0.35, type: 'sawtooth' },
      { freq: 523.25, time: 1.0, dur: 0.15, type: 'sawtooth' },
      { freq: 659.25, time: 1.18, dur: 0.15, type: 'sawtooth' },
      { freq: 783.99, time: 1.36, dur: 0.15, type: 'sawtooth' },
      { freq: 1046.50, time: 1.54, dur: 0.35, type: 'sawtooth' }
    ]);
  }

  // 5. Gentle Gong — Deep warm resonating gong
  private playGentleGong() {
    this.playNoteSequence([
      { freq: 196.00, time: 0.0, dur: 1.2, type: 'sine' },
      { freq: 293.66, time: 0.1, dur: 1.0, type: 'sine' },
      { freq: 146.83, time: 0.8, dur: 1.5, type: 'sine' }
    ]);
  }

  // 6. Triple Fanfare — Triumphant ascending three-note flourish (C5→E5→G5 → octave C6)
  private playTripleFanfare() {
    this.playNoteSequence([
      { freq: 523.25, time: 0.0, dur: 0.25 },
      { freq: 659.25, time: 0.2, dur: 0.25 },
      { freq: 783.99, time: 0.4, dur: 0.25 },
      { freq: 1046.50, time: 0.65, dur: 0.5 }
    ]);
  }

  // Play alarm by key (used at timer expiry)
  playAlarmByKey(key: AlarmSoundKey) {
    switch (key) {
      case 'classic': this.playClassicChime(); break;
      case 'digital': this.playDigitalBeeps(); break;
      case 'school-bell': this.playSchoolBell(); break;
      case 'emergency': this.playEmergencyAlert(); break;
      case 'gentle-gong': this.playGentleGong(); break;
      case 'triple-fanfare': this.playTripleFanfare(); break;
      default: this.playClassicChime();
    }
  }

  private alarmLoopTimer: any = null;
  private isAlarmLooping: boolean = false;

  // Start continuous looping alarm until user clicks a button to stop it
  startAlarmLoop(key: AlarmSoundKey) {
    this.stopAlarmLoop();
    if (this.isMuted) return;

    this.isAlarmLooping = true;
    this.playAlarmByKey(key);

    const intervals: Record<AlarmSoundKey, number> = {
      'classic': 1600,
      'digital': 1200,
      'school-bell': 1800,
      'emergency': 2200,
      'gentle-gong': 2600,
      'triple-fanfare': 1900
    };

    const interval = intervals[key] || 1800;
    this.alarmLoopTimer = setInterval(() => {
      if (this.isAlarmLooping && !this.isMuted) {
        this.playAlarmByKey(key);
      }
    }, interval);
  }

  // Stop continuous alarm loop immediately
  stopAlarmLoop() {
    this.isAlarmLooping = false;
    if (this.alarmLoopTimer !== null) {
      clearInterval(this.alarmLoopTimer);
      this.alarmLoopTimer = null;
    }
  }

  getIsAlarmLooping(): boolean {
    return this.isAlarmLooping;
  }

  // Legacy: Play a beautiful exam chime (Ding-Dong or Tri-tone)
  playAlarmChime() {
    this.playClassicChime();
  }

  // Play a critical warning sound (three fast warnings)
  playWarningBeeps() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    
    // Play 3 high-pitch warning double-beeps spaced apart
    const intervals = [0.0, 0.25, 0.5];
    intervals.forEach((time) => {
      this.playBeep(880, 0.1, 'sine', time);
    });
  }
}

export const sound = new SoundManager();
