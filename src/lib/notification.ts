// Notification Sound System
export const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.value = 960;
    g.gain.setValueAtTime(0.9, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 1.5);
  } catch {
    console.log('Audio not supported');
  }
};

// Quick Messages
export const DRIVER_QUICK_MESSAGES = [
  "أنا قادم 🚗",
  "لقد وصلت 📍",
  "انتظرني قليلاً ⏳",
  "أين أنت بالضبط؟ 📍",
  "في الطريق إليك 🛣️",
];

export const PASSENGER_QUICK_MESSAGES = [
  "حسناً، في انتظارك ✅",
  "أنا أمام المبنى 🏢",
  "كم دقيقة تبقى؟ ⏱️",
  "شكراً 🙏",
  "أنا جاهز 👍",
];
