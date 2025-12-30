'use client';

/**
 * Cosmic Background Components
 *
 * AnimatedBackground: Pure black space with subtle gradient orbs
 * Starfield: Dense field of twinkling stars with blue tones
 */

import { useState, useEffect } from 'react';

// Animated background with gradient mesh
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Pure black space background */}
      <div className="absolute inset-0 bg-black" />

      {/* Animated gradient orbs - extremely subtle for true deep space */}
      <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px] animate-blob" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[150px] animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-1/2 w-[700px] h-[700px] bg-cyan-500/5 rounded-full blur-[150px] animate-blob animation-delay-4000" />
    </div>
  );
}

// Starfield background
export function Starfield() {
  const [stars, setStars] = useState<Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
    twinkle: boolean;
    color: string;
    delay: number;
  }>>([]);

  useEffect(() => {
    // Generate random stars - dense starfield
    const newStars = Array.from({ length: 400 }, () => ({
      x: Math.random() * 100, // percentage
      y: Math.random() * 100,
      size: Math.random() > 0.8 ? 2 : Math.random() > 0.95 ? 3 : 1,
      opacity: 0.3 + Math.random() * 0.5,
      twinkle: Math.random() > 0.5,
      color: Math.random() > 0.6 ? 'rgba(96, 165, 250, 1)' : Math.random() > 0.8 ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 1)',
      delay: Math.random() * 5,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 -z-[5] overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className={star.twinkle ? 'animate-twinkle' : ''}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            borderRadius: '50%',
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            boxShadow: star.size > 1 ? `0 0 ${star.size * 2}px ${star.color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}
