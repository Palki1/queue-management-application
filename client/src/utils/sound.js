/**
 * Web Audio API synthesizer for lobby bell & chime sounds
 * Completely self-contained, no external MP3 dependencies required.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  getAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Classic two-tone airport / bank lobby chime: "Ding-Dong" (E5 -> C5)
   */
  playChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: C5 (523.25 Hz) after 0.25 seconds
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.25);
      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.25);
      osc2.stop(now + 1.0);
    } catch (err) {
      console.warn('Audio chime playback blocked or not supported:', err);
    }
  }

  /**
   * Cheerful success chime for service completion
   */
  playSuccess() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.45);
      });
    } catch (err) {
      console.warn('Success sound failed:', err);
    }
  }

  /**
   * Progressive Text-To-Speech (TTS) Lobby Announcement
   * Synthesizes voice announcement: "Token CS-011, please proceed to Counter 1"
   */
  speakAnnouncement(tokenNumber, customerName = '', counterName = 'Counter 1') {
    // Play chime first
    this.playChime();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      // Small 0.6s delay to let the two-tone chime ring first
      setTimeout(() => {
        window.speechSynthesis.cancel(); // Stop any pending speech

        // Spell out token prefix and number clearly, e.g. "Token C S 0 1 1"
        const formattedToken = tokenNumber.replace(/(\w)/g, '$1 ').trim();
        const text = `Token ${tokenNumber}. ${customerName ? customerName + '.' : ''} Please proceed to ${counterName}.`;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Slightly measured, professional pace
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        // Try to pick a natural English voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Daniel')));
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        window.speechSynthesis.speak(utterance);
      }, 650);
    } catch (err) {
      console.warn('Speech synthesis announcement error:', err);
    }
  }
}

export const sounds = new SoundEffects();
