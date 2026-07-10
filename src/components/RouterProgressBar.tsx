import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Slim top-of-viewport loading indicator that rides TanStack Router's
 * pending navigation state. Gives every SSR / route transition a snappy
 * feedback bar without pulling in nprogress.
 */
export function RouterProgressBar() {
  const status = useRouterState({ select: (s) => s.status });
  const isPending = status === "pending";
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (isPending) {
      setVisible(true);
      setProgress(8);
      const tick = () => {
        setProgress((p) => (p < 85 ? p + (85 - p) * 0.08 : p));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else if (visible) {
      setProgress(100);
      timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
