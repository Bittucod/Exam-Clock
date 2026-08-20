// Timer state management and accurate timestamp engine

export interface ExamPreset {
  id: string;
  name: string;
  durationSec: number;
  showQuestions: boolean;
  totalQuestions: number;
}

export interface HistoryRecord {
  id: string;
  date: string;
  name: string;
  durationSec: number;
  elapsedSec: number;
  mode: 'exam' | 'study';
  status: 'Completed' | 'Stopped';
  questionsCount?: number;
  completionPercent: number;
}

export interface AppSettings {
  clockRepresentation: 'remaining' | 'elapsed' | 'wall';
  showSeconds: boolean;
  show24h: boolean;
  strictMode: boolean;
  soundOn: boolean;
  volume: number;
  questionProgress: boolean;
  warnings: number[]; // remaining minutes when warning should trigger
  clockTheme: 'classic' | 'wall' | 'flip' | 'magnifier' | 'film';
}

export interface ActiveTimer {
  name: string;
  isRunning: boolean;
  isPaused: boolean;
  startTimestamp: number;
  endTimestamp: number;
  lastPauseTimestamp: number | null;
  totalDurationSec: number;
  mode: 'exam' | 'study';
  strictMode: boolean;
  showQuestions: boolean;
  totalQuestions: number;
  
  // Study mode specific
  studyType: 'countdown' | 'stopwatch' | 'pomodoro';
  pomoState: 'work' | 'shortBreak' | 'longBreak';
  currentQuestion?: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  clockRepresentation: 'remaining',
  showSeconds: true,
  show24h: false,
  strictMode: false,
  soundOn: true,
  volume: 50,
  questionProgress: false,
  warnings: [60, 30, 15, 10, 5, 1],
  clockTheme: 'classic'
};

const DEFAULT_PRESETS: ExamPreset[] = [
  { id: '1', name: 'JEE Mock Test', durationSec: 10800, showQuestions: true, totalQuestions: 90 }, // 3h
  { id: '2', name: 'NEET Mock Test', durationSec: 11520, showQuestions: true, totalQuestions: 200 }, // 3h 12m
  { id: '3', name: 'UPSC Mock Test', durationSec: 7200, showQuestions: true, totalQuestions: 100 }, // 2h
  { id: '4', name: 'Board Exam', durationSec: 10800, showQuestions: false, totalQuestions: 30 }
];

export class TimerEngine {
  public settings: AppSettings = { ...DEFAULT_SETTINGS };
  public presets: ExamPreset[] = [];
  public history: HistoryRecord[] = [];
  public activeTimer: ActiveTimer | null = null;
  
  // Keep track of triggered warnings so they don't fire multiple times
  private triggeredWarnings: Set<number> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState() {
    if (typeof window === 'undefined') return;

    try {
      // Load Settings
      const savedSettings = localStorage.getItem('exam-clock-settings');
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }

      // Load Presets
      const savedPresets = localStorage.getItem('exam-clock-presets');
      if (savedPresets) {
        this.presets = JSON.parse(savedPresets);
      } else {
        this.presets = [...DEFAULT_PRESETS];
        this.savePresets();
      }

      // Load History
      const savedHistory = localStorage.getItem('exam-clock-history');
      if (savedHistory) {
        this.history = JSON.parse(savedHistory);
      }

      // Load Active Timer
      const savedActive = localStorage.getItem('exam-clock-active');
      if (savedActive) {
        this.activeTimer = JSON.parse(savedActive);
        // Load triggered warnings
        const savedTriggered = localStorage.getItem('exam-clock-triggered-warnings');
        if (savedTriggered) {
          this.triggeredWarnings = new Set(JSON.parse(savedTriggered));
        }
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
  }

  public saveSettings() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('exam-clock-settings', JSON.stringify(this.settings));
  }

  public savePresets() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('exam-clock-presets', JSON.stringify(this.presets));
  }

  public saveHistory() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('exam-clock-history', JSON.stringify(this.history));
  }

  public saveActiveTimer() {
    if (typeof window === 'undefined') return;
    if (this.activeTimer) {
      localStorage.setItem('exam-clock-active', JSON.stringify(this.activeTimer));
      localStorage.setItem('exam-clock-triggered-warnings', JSON.stringify(Array.from(this.triggeredWarnings)));
    } else {
      localStorage.removeItem('exam-clock-active');
      localStorage.removeItem('exam-clock-triggered-warnings');
    }
  }

  // Active state calculations
  public getTimerMetrics(): { remaining: number; elapsed: number; total: number; progressPercent: number } {
    if (!this.activeTimer) {
      return { remaining: 0, elapsed: 0, total: 0, progressPercent: 0 };
    }

    const total = this.activeTimer.totalDurationSec;
    const now = Date.now();

    if (this.activeTimer.mode === 'study' && this.activeTimer.studyType === 'stopwatch') {
      // Stopwatch: count up, no remaining/total limit conceptually, but we track since start
      let elapsed = 0;
      if (this.activeTimer.isRunning) {
        if (this.activeTimer.isPaused && this.activeTimer.lastPauseTimestamp) {
          elapsed = Math.floor((this.activeTimer.lastPauseTimestamp - this.activeTimer.startTimestamp) / 1000);
        } else {
          elapsed = Math.floor((now - this.activeTimer.startTimestamp) / 1000);
        }
      }
      return { remaining: 0, elapsed: Math.max(0, elapsed), total: 0, progressPercent: 0 };
    }

    // Countdown / Exam / Pomodoro
    let remaining = total;
    let elapsed = 0;

    if (this.activeTimer.isRunning) {
      if (this.activeTimer.isPaused && this.activeTimer.lastPauseTimestamp) {
        remaining = Math.floor((this.activeTimer.endTimestamp - this.activeTimer.lastPauseTimestamp) / 1000);
      } else {
        remaining = Math.floor((this.activeTimer.endTimestamp - now) / 1000);
      }

      remaining = Math.max(0, remaining);
      elapsed = total - remaining;
    }

    const progressPercent = total > 0 ? (remaining / total) * 100 : 0;

    return {
      remaining,
      elapsed: Math.max(0, elapsed),
      total,
      progressPercent
    };
  }

  // Start exam timer
  public startExam(name: string, durationSec: number, totalQuestions: number = 0, showQuestions: boolean = false) {
    const start = Date.now();
    this.activeTimer = {
      name,
      isRunning: true,
      isPaused: false,
      startTimestamp: start,
      endTimestamp: start + durationSec * 1000,
      lastPauseTimestamp: null,
      totalDurationSec: durationSec,
      mode: 'exam',
      strictMode: this.settings.strictMode,
      showQuestions,
      totalQuestions,
      currentQuestion: showQuestions ? 1 : undefined,
      studyType: 'countdown',
      pomoState: 'work'
    };
    this.triggeredWarnings.clear();
    this.saveActiveTimer();
  }

  // Start study timer
  public startStudy(type: 'countdown' | 'stopwatch' | 'pomodoro', durationSec = 1500) {
    const start = Date.now();
    const pomoState = type === 'pomodoro' ? 'work' : 'work';
    this.activeTimer = {
      name: type === 'pomodoro' ? 'Pomodoro Study' : type === 'stopwatch' ? 'Study Stopwatch' : 'Study Timer',
      isRunning: true,
      isPaused: false,
      startTimestamp: start,
      endTimestamp: start + durationSec * 1000,
      lastPauseTimestamp: null,
      totalDurationSec: durationSec,
      mode: 'study',
      strictMode: false,
      showQuestions: false,
      totalQuestions: 0,
      studyType: type,
      pomoState: pomoState
    };
    this.triggeredWarnings.clear();
    this.saveActiveTimer();
  }

  public pause() {
    if (!this.activeTimer || !this.activeTimer.isRunning || this.activeTimer.isPaused) return;
    if (this.activeTimer.mode === 'exam' && this.activeTimer.strictMode) {
      console.warn("Cannot pause in strict exam mode");
      return;
    }

    this.activeTimer.isPaused = true;
    this.activeTimer.lastPauseTimestamp = Date.now();
    this.saveActiveTimer();
  }

  public resume() {
    if (!this.activeTimer || !this.activeTimer.isRunning || !this.activeTimer.isPaused || !this.activeTimer.lastPauseTimestamp) return;

    const pauseDelta = Date.now() - this.activeTimer.lastPauseTimestamp;
    this.activeTimer.startTimestamp += pauseDelta;
    this.activeTimer.endTimestamp += pauseDelta;
    this.activeTimer.isPaused = false;
    this.activeTimer.lastPauseTimestamp = null;
    this.saveActiveTimer();
  }

  public updateCurrentQuestion(qNum: number) {
    if (!this.activeTimer || !this.activeTimer.showQuestions) return;
    const maxQ = this.activeTimer.totalQuestions || 100;
    this.activeTimer.currentQuestion = Math.max(1, Math.min(maxQ, qNum));
    this.saveActiveTimer();
  }

  public reset(completedStatus: 'Completed' | 'Stopped' = 'Stopped') {
    if (!this.activeTimer) return;

    // Save to history before clearing (if elapsed more than 5 seconds)
    const metrics = this.getTimerMetrics();
    if (metrics.elapsed > 5) {
      const record: HistoryRecord = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        name: this.activeTimer.name,
        durationSec: this.activeTimer.totalDurationSec,
        elapsedSec: metrics.elapsed,
        mode: this.activeTimer.mode,
        status: completedStatus,
        questionsCount: this.activeTimer.showQuestions ? this.activeTimer.totalQuestions : undefined,
        completionPercent: Math.round(((this.activeTimer.totalDurationSec - metrics.remaining) / this.activeTimer.totalDurationSec) * 100)
      };
      
      // If it's a stopwatch, the durationSec is just the elapsedSec
      if (this.activeTimer.mode === 'study' && this.activeTimer.studyType === 'stopwatch') {
        record.durationSec = metrics.elapsed;
        record.completionPercent = 100;
      }

      this.history.unshift(record);
      this.saveHistory();
    }

    this.activeTimer = null;
    this.triggeredWarnings.clear();
    this.saveActiveTimer();
  }

  // Manage presets
  public addPreset(name: string, durationSec: number, showQuestions: boolean, totalQuestions: number) {
    const newPreset: ExamPreset = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      durationSec,
      showQuestions,
      totalQuestions
    };
    this.presets.push(newPreset);
    this.savePresets();
  }

  public renamePreset(id: string, newName: string) {
    const preset = this.presets.find(p => p.id === id);
    if (preset) {
      preset.name = newName;
      this.savePresets();
    }
  }

  public deletePreset(id: string) {
    this.presets = this.presets.filter(p => p.id !== id);
    this.savePresets();
  }

  public clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  // Warnings check
  // Returns warning minutes that just triggered in this check loop
  public checkWarnings(remainingSec: number): number | null {
    if (!this.activeTimer || this.activeTimer.isPaused) return null;

    const remainingMin = Math.ceil(remainingSec / 60);

    for (const w of this.settings.warnings) {
      // If remaining minutes is exactly w or lower, and we haven't triggered it yet
      // Also, make sure we don't trigger if the initial duration started below that warning threshold
      const startDurationMin = Math.ceil(this.activeTimer.totalDurationSec / 60);
      
      if (remainingMin <= w && w < startDurationMin && !this.triggeredWarnings.has(w)) {
        this.triggeredWarnings.add(w);
        this.saveActiveTimer();
        return w;
      }
    }
    return null;
  }
}
