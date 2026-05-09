"use client";

import React, { useEffect, useRef } from 'react';

interface BreathingVisualizerProps {
  breathingRate: number;
  stressLevel: number;
  isActive: boolean;
}

export default function BreathingVisualizer({ 
  breathingRate, 
  stressLevel, 
  isActive 
}: BreathingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!isActive) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set canvas size
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.001;

      // Breathing circle animation
      const breathPhase = Math.sin(time * (breathingRate / 60) * Math.PI * 2);
      const circleRadius = 30 + breathPhase * 20;
      
      // Color based on stress level
      const stressColor = stressLevel > 0.7 ? '#ef4444' : 
                         stressLevel > 0.4 ? '#f59e0b' : '#10b981';
      
      // Draw breathing circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
      ctx.fillStyle = stressColor;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw breathing guide
      if (breathingRate > 20) {
        // Fast breathing - show slow breathing guide
        drawSlowBreathingGuide(ctx, centerX, centerY, time);
      } else if (breathingRate < 10) {
        // Slow breathing - show normal breathing guide
        drawNormalBreathingGuide(ctx, centerX, centerY, time);
      } else {
        // Normal breathing - show current pattern
        drawCurrentBreathingPattern(ctx, centerX, centerY, time, breathingRate);
      }

      // Draw stress indicator
      drawStressIndicator(ctx, canvas.width, canvas.height, stressLevel);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [breathingRate, stressLevel, isActive]);

  const drawSlowBreathingGuide = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    // Draw slow breathing guide circles
    const guideRadius = 60;
    const guidePhase = Math.sin(time * 0.5) * 0.5 + 0.5;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, guideRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    
    // Animated guide dot
    ctx.beginPath();
    ctx.arc(centerX, centerY + guideRadius, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.globalAlpha = guidePhase;
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawNormalBreathingGuide = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number) => {
    // Draw normal breathing guide
    const guideRadius = 80;
    const guidePhase = Math.sin(time * 1.5) * 0.5 + 0.5;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, guideRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.stroke();
    
    // Animated guide dot
    ctx.beginPath();
    ctx.arc(centerX, centerY + guideRadius, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.globalAlpha = guidePhase;
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawCurrentBreathingPattern = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number, rate: number) => {
    // Draw current breathing pattern visualization
    const patternRadius = 70;
    const patternPhase = Math.sin(time * (rate / 60) * Math.PI * 2);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, patternRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    
    // Breathing rhythm dots
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + time * 2;
      const x = centerX + Math.cos(angle) * patternRadius;
      const y = centerY + Math.sin(angle) * patternRadius;
      const alpha = Math.sin(time * 3 + i) * 0.5 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const drawStressIndicator = (ctx: CanvasRenderingContext2D, width: number, height: number, stressLevel: number) => {
    // Draw stress level bar at the bottom
    const barHeight = 8;
    const barWidth = width * 0.8;
    const barX = (width - barWidth) / 2;
    const barY = height - barHeight - 20;
    
    // Background bar
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Stress level fill
    const fillWidth = barWidth * stressLevel;
    const stressColor = stressLevel > 0.7 ? '#ef4444' : 
                       stressLevel > 0.4 ? '#f59e0b' : '#10b981';
    
    ctx.fillStyle = stressColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);
    
    // Stress level text
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Stress: ${Math.round(stressLevel * 100)}%`, width / 2, height - 5);
  };

  return (
    <div className="w-full h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-medium text-gray-800">Breathing Visualization</h3>
        <p className="text-sm text-gray-600">
          {isActive ? 'Follow the breathing pattern' : 'Start a session to see visualization'}
        </p>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-48 border border-gray-200 rounded-lg bg-white"
        style={{ display: isActive ? 'block' : 'none' }}
      />
      
      {!isActive && (
        <div className="h-48 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">🫁</div>
            <p>Start a meditation session to see your breathing visualization</p>
          </div>
        </div>
      )}
    </div>
  );
}
