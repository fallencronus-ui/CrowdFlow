import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
  className,
  duration = 550,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (Math.abs(from - value) < 0.0001) return;
    let raf = 0;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const next = from + (value - from) * eased;
      setDisplay(next);
      fromRef.current = next;
      if (k < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {display.toLocaleString("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
