// Notification Sound System

let alarmCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

// Single short beep (used for status transitions)
export const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 960;
    g.gain.setValueAtTime(0.9, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 1.5);
  } catch {
    console.log("Audio not supported");
  }
};

// Start a continuous looping alarm (beeps every 1.2s) until stopped.
export const startAlarm = () => {
  stopAlarm();
  try {
    alarmCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    console.log("Audio not supported");
    return;
  }

  const playBeep = () => {
    if (!alarmCtx) return;
    try {
      const o = alarmCtx.createOscillator();
      const g = alarmCtx.createGain();
      o.connect(g);
      g.connect(alarmCtx.destination);
      o.type = "sine";
      o.frequency.value = 1000;
      g.gain.setValueAtTime(0.0001, alarmCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.9, alarmCtx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, alarmCtx.currentTime + 0.5);
      o.start(alarmCtx.currentTime);
      o.stop(alarmCtx.currentTime + 0.55);
    } catch {
      // ignore
    }
  };

  playBeep();
  alarmInterval = setInterval(playBeep, 1200);
};

// Stop the continuous alarm.
export const stopAlarm = () => {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (alarmCtx) {
    try {
      alarmCtx.close();
    } catch {
      // ignore
    }
    alarmCtx = null;
  }
};

// Quick Messages
export const DRIVER_QUICK_MESSAGES = [
  "لقد وصلت 📍",
  "أنا في الطريق إليك 🚗",
  "سأتأخر قليلاً ⏳",
  "أين موقعك بالضبط؟ 📍",
];

export const PASSENGER_QUICK_MESSAGES = [
  "متى ستصل؟ ⏱️",
  "أنا بانتظارك ✋",
  "حسناً شكراً 🙏",
  "سأتأخر دقيقتين ⏱️",
];
