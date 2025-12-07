'use client';

import React, { useEffect, useState, useRef } from 'react';

interface Circle {
    id: number;
    size: number;
    x: number;
    y: number;
    deltaX: number;
    deltaY: number;
    moving: boolean;
    nextChange: number;
    color: string;
}

interface RandomCirclesProps {
    numCircles?: number;
    minSize?: number;
    maxSize?: number;
    speed?: number;
    color?: string;
}

export default function RandomCircles({
    numCircles = 10,
    minSize = 6,
    maxSize = 20,
    speed = 0.5,
    color = '#0092FF',
}: RandomCirclesProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [circles, setCircles] = useState<Circle[]>([]);

    // Initialize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        const initialCircles: Circle[] = Array.from({ length: numCircles }, (_, i) => {
        const size = Math.random() * (maxSize - minSize) + minSize;
        return {
            id: i,
            size,
            x: Math.random() * (width - size),
            y: Math.random() * (height - size),
            deltaX: ((Math.random() - 0.5) * speed) || (0.3 * speed),
            deltaY: ((Math.random() - 0.5) * speed) || (0.3 * speed),
            moving: true,
            nextChange: Date.now() + randomBetween(500, 2000),
            color,
        };
        });

        setCircles(initialCircles);
    }, []);

    // Animation loop
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();

            setCircles(prev => {
                const container = containerRef.current;
                if (!container) return prev;

                const width = container.clientWidth;
                const height = container.clientHeight;

                return prev.map(circle => {
                    let { moving, nextChange } = circle;

                    if (now > nextChange) {
                        moving = !moving;
                        nextChange = now + (moving ? randomBetween(500, 2000) : randomBetween(300, 1000));
                    }

                    let deltaX = circle.deltaX;
                    let deltaY = circle.deltaY;

                    if (moving) {
                        // Gentle angle change
                        deltaX += (Math.random() - 0.5) * 0.03;
                        deltaY += (Math.random() - 0.5) * 0.03;

                        // Keep speed consistent
                        const mag = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1;
                        deltaX = (deltaX / mag) * speed;
                        deltaY = (deltaY / mag) * speed;
                    }

                    let newX = circle.x + (moving ? deltaX : 0);
                    let newY = circle.y + (moving ? deltaY : 0);

                    const size = circle.size;

                    // --- ellipse boundary check ---
                    const cx = newX + size / 2;
                    const cy = newY + size / 2;
                    const a = width / 2;
                    const b = height / 2;
                    const dx = cx - a;
                    const dy = cy - b;
                    const insideEllipse = (dx * dx) / (a * a) + (dy * dy) / (b * b) <= 1;

                    if (!insideEllipse) {
                        // Push back inside smoothly
                        const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                        const inwardX = -dx / mag;
                        const inwardY = -dy / mag;

                        return {
                            ...circle,
                            x: clamp(circle.x + inwardX * speed, 0, width - size),
                            y: clamp(circle.y + inwardY * speed, 0, height - size),
                            deltaX: inwardX * speed,
                            deltaY: inwardY * speed,
                            moving,
                            nextChange,
                        };
                    }

                    return {
                        ...circle,
                        x: newX,
                        y: newY,
                        deltaX,
                        deltaY,
                        moving,
                        nextChange,
                    };
                });
            });
        }, 16);

        return () => clearInterval(interval);
    }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
        {circles.map(c => (
            <div
                key={c.id}
                style={{
                    position: 'absolute',
                    left: c.x,
                    top: c.y,
                    width: c.size,
                    height: c.size,
                    borderRadius: '50%',
                    backgroundColor: c.color,
                    opacity: c.moving ? 1 : 0.5,
                    transition: 'opacity 0.3s',
                    boxShadow: `0 0 6px ${c.color}`,
                }}
            />
        ))}
    </div>
  );
}

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
}
