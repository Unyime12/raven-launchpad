"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

function getTimeLeft(deadline: number) {
  const now = Date.now() / 1000;
  const diff = Math.max(0, deadline - now);
  return {
    diff,
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: Math.floor(diff % 60),
  };
}

export default function CountdownTimer({
  deadline,
  ended,
  size = "sm",
}: {
  deadline?: number;
  ended?: boolean;  
  size?: "sm" | "lg";
}) {
  const [timeLeft, setTimeLeft] = useState(() =>
    deadline ? getTimeLeft(deadline) : null
  );

  useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (!deadline) {
    return (
      <span className="text-zinc-600 text-[10px] italic"> </span>
    );
  }

  const isEnded = ended || (timeLeft && timeLeft.diff <= 0);

  if (isEnded) {
    return (
      <span
        className={`flex items-center gap-1 font-bold text-zinc-500 ${
          size === "lg" ? "text-sm" : "text-[10px]"
        }`}
      >
        <Clock size={size === "lg" ? 13 : 10} /> Ended
      </span>
    );
  }

  if (!timeLeft) return null;
  const { days, hours, minutes, seconds } = timeLeft;

  return (
    <span
      className={`flex items-center gap-1 font-bold text-violet-400 tabular-nums ${
        size === "lg" ? "text-sm" : "text-[10px]"
      }`}
    >
      <Clock size={size === "lg" ? 13 : 10} />
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </span>
  );
}