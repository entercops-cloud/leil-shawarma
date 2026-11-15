// Restaurant Audio & Haptic Notification System for Real-time New Orders

class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialize on first interaction to comply with browser autoplay policies
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Plays a distinct, pleasant 3-tone restaurant order chime
   * Guaranteed to work offline and with zero external network dependencies
   */
  public playNewOrderChime() {
    if (!this.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note sequence: D5 (587.3Hz) -> F#5 (739.9Hz) -> A5 (880Hz) -> D6 (1174.6Hz)
      const notes = [
        { freq: 587.33, time: 0.0, duration: 0.25 },
        { freq: 739.99, time: 0.15, duration: 0.25 },
        { freq: 880.00, time: 0.30, duration: 0.35 },
        { freq: 1174.66, time: 0.48, duration: 0.65 },
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Warm chime harmonic timbre
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.time);

        // Exponential volume decay for bell chime feel
        gain.gain.setValueAtTime(0.001, now + note.time);
        gain.gain.linearRampToValueAtTime(0.4, now + note.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.time);
        osc.stop(now + note.time + note.duration);
      });
    } catch (e) {
      console.warn('Audio playback not permitted or supported yet:', e);
    }
  }

  /**
   * Triggers haptic vibration pattern on mobile devices (e.g. smartphone of cashier/manager)
   */
  public triggerHapticFeedback() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        // Double-pulse haptic pattern: buzz - wait - strong buzz
        navigator.vibrate([180, 80, 240, 100, 350]);
      }
    } catch {
      // Ignored if device doesn't support vibration
    }
  }

  /**
   * Full alert: Chime + Vibration combined
   */
  public notifyNewOrder() {
    this.playNewOrderChime();
    this.triggerHapticFeedback();
  }
}

export const orderAlertManager = new SoundManager();
