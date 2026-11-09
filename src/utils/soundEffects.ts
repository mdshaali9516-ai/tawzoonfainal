/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Premium Web Audio API Sound Effects for Tawzoon Nexus
// Synthesizes crystal-clear, professional audio tones without external mp3 asset dependencies.

let sharedAudioCtx: AudioContext | null = null;
let lastNotifSoundTime = 0;
let lastLoginSoundTime = 0;
let lastLogoutSoundTime = 0;

/**
 * Returns a running or resumable shared AudioContext instance.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

// User-gesture unlocker: unlocks browser autoplay audio on initial tap or click anywhere
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Plays a pleasant, crystal-clear dual bell chime for incoming notifications
 */
export function playNotificationSound() {
  const nowMs = Date.now();
  if (nowMs - lastNotifSoundTime < 600) return; // Prevent duplicate overlapping playback
  lastNotifSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const execute = () => {
      try {
        const now = ctx.currentTime;
        const notes = [
          { freq: 698.46, time: now, duration: 0.18, gain: 0.18 },
          { freq: 1046.50, time: now + 0.11, duration: 0.38, gain: 0.22 }
        ];

        notes.forEach(({ freq, time, duration, gain: gainVal }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + duration);
        });
      } catch {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(execute).catch(execute);
    } else {
      execute();
    }
  } catch {
    // Audio unavailable or blocked by browser policy
  }
}

/**
 * Plays a warm rising melodic chord when user signs in successfully
 */
export function playLoginSuccessSound() {
  const nowMs = Date.now();
  if (nowMs - lastLoginSoundTime < 600) return;
  lastLoginSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const execute = () => {
      try {
        const now = ctx.currentTime;
        // Warm rising chord (C5 -> E5 -> G5 -> C6)
        const notes = [
          { freq: 523.25, time: now, duration: 0.14, gain: 0.16 },
          { freq: 659.25, time: now + 0.08, duration: 0.14, gain: 0.18 },
          { freq: 783.99, time: now + 0.16, duration: 0.16, gain: 0.22 },
          { freq: 1046.50, time: now + 0.24, duration: 0.45, gain: 0.26 }
        ];

        notes.forEach(({ freq, time, duration, gain: gainVal }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(gainVal, time + 0.025);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + duration);
        });
      } catch {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(execute).catch(execute);
    } else {
      execute();
    }
  } catch {}
}

/**
 * Plays a smooth, warm descending tone sequence when user signs out
 */
export function playLogoutSound() {
  const nowMs = Date.now();
  if (nowMs - lastLogoutSoundTime < 600) return;
  lastLogoutSoundTime = nowMs;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const execute = () => {
      try {
        const now = ctx.currentTime;
        // Gentle descending tones (G5 -> E5 -> C5 -> G4)
        const notes = [
          { freq: 783.99, time: now, duration: 0.14, gain: 0.18 },
          { freq: 659.25, time: now + 0.09, duration: 0.14, gain: 0.16 },
          { freq: 523.25, time: now + 0.18, duration: 0.16, gain: 0.15 },
          { freq: 392.00, time: now + 0.27, duration: 0.38, gain: 0.14 }
        ];

        notes.forEach(({ freq, time, duration, gain: gainVal }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + duration);
        });
      } catch {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(execute).catch(execute);
    } else {
      execute();
    }
  } catch {}
}

/**
 * Plays a concise confirmation chime for positive actions
 */
export function playSuccessActionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const execute = () => {
      try {
        const now = ctx.currentTime;
        const notes = [
          { freq: 880.00, time: now, duration: 0.12, gain: 0.14 },
          { freq: 1318.51, time: now + 0.10, duration: 0.28, gain: 0.18 }
        ];

        notes.forEach(({ freq, time, duration, gain: gainVal }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(gainVal, time + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(time);
          osc.stop(time + duration);
        });
      } catch {}
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(execute).catch(execute);
    } else {
      execute();
    }
  } catch {}
}
