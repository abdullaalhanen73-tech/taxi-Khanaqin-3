import { useEffect } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-ink-bg animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 rounded-full animate-pulse-ring" />
        <div className="w-28 h-28 rounded-full bg-gradient-to-b from-gold-light to-gold-dark flex items-center justify-center text-5xl shadow-2xl shadow-gold/30 animate-scale-in">
          🚕
        </div>
      </div>
      <h1 className="mt-8 text-3xl font-extrabold bg-gradient-to-b from-gold-light to-gold-dark bg-clip-text text-transparent animate-slide-up">
        تكسي خانقين
      </h1>
      <p className="mt-2 text-sm text-txt-muted animate-slide-up">
        خدمة طلب التكسي في خانقين
      </p>
      <div className="mt-10 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-gold animate-bounce-dot"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </div>
  );
}
