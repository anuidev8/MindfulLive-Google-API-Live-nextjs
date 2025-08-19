"use client";

import React, { useEffect, useRef } from "react";
import c from "classnames";

const lineCount = 7; // More lines for a weave effect
const maxHeight = 32;
const minHeight = 6;
const waveAmplitude = 12;
const waveSpeed = 0.0025; // Lower is slower

export type AudioPulseProps = {
  active: boolean;
  volume: number;
  hover?: boolean;
};

export default function AudioPulse({ active, volume, hover }: AudioPulseProps) {
  const lines = useRef<HTMLDivElement[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    let running = true;
    const animate = (now: number) => {
      lines.current.forEach((line, i) => {
        if (!line) return;
        // Sine wave for weave, modulated by volume
        const phase = (i / lineCount) * Math.PI * 2;
        const t = now * waveSpeed;
        const base = minHeight + (maxHeight - minHeight) * Math.min(1, volume);
        const weave = Math.sin(t + phase) * waveAmplitude;
        line.style.height = `${Math.max(minHeight, base + weave)}px`;
        line.style.transform = `translateY(${Math.sin(t + phase) * 4}px)`;
      });
      if (running) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [volume]);

  return (
    <div className={c("audioPulse weave", { active, hover })} style={{ display: "flex", alignItems: "end", gap: 2 }}>
      {Array(lineCount)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            ref={(el) => (lines.current[i] = el!)}
            style={{
              width: 6,
              borderRadius: 3,
              background: "linear-gradient(180deg, #a5b4fc 0%, #818cf8 100%)",
              transition: "background 0.2s",
              marginLeft: i === 0 ? 0 : 2,
              marginRight: i === lineCount - 1 ? 0 : 2,
            }}
          />
        ))}
    </div>
  );
} 