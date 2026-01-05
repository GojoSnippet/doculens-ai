'use client';

import { useEffect, useState } from 'react';

interface TypewriterProps {
  text: string;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, delay = 50, className = '' }: TypewriterProps) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, delay);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, text]);

  return (
    <span className={className}>
      {displayText}
      {currentIndex < text.length && (
        <span className="animate-pulse text-emerald-500">|</span>
      )}
    </span>
  );
}

interface TextRevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function TextReveal({ children, delay = 0, className = '' }: TextRevealProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <span
      className={`inline-block transition-all duration-700 ${
        isVisible
          ? 'opacity-100 translate-y-0 blur-0'
          : 'opacity-0 translate-y-4 blur-sm'
      } ${className}`}
    >
      {children}
    </span>
  );
}

interface WordRevealProps {
  text: string;
  className?: string;
  wordDelay?: number;
}

export function WordReveal({ text, className = '', wordDelay = 100 }: WordRevealProps) {
  const words = text.split(' ');

  return (
    <span className={className}>
      {words.map((word, i) => (
        <TextReveal key={i} delay={i * wordDelay}>
          {word}{' '}
        </TextReveal>
      ))}
    </span>
  );
}

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

export function CountUp({ end, duration = 2000, className = '', suffix = '' }: CountUpProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span className={className}>
      {count}{suffix}
    </span>
  );
}
