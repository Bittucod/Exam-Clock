// Web Audio API Synthesizer for offline, professional alarms

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

  // Play a beautiful exam chime (Ding-Dong or Tri-tone)
  playAlarmChime() {
    if (this.isMuted) return;
    // Elegant dual chime: E5 (659.25Hz) followed by B4 (493.88Hz)
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.4 },
      { freq: 493.88, time: 0.25, dur: 0.6 }
    ];

    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
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
      console.warn("Chime failed to play:", err);
    }
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
