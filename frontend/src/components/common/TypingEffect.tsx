'use client';

import React, { useEffect, useState } from 'react';

interface TypingEffectProps {
    baseContent: string; // stays static
    typingEffectContent: string[]; // content to type
    typingSpeed?: number; // ms per character
    delayBetween?: number; // ms between switching
    showCursor?: boolean; // show blinking cursor (default false)
}

export default function TypingEffect({
    baseContent,
    typingEffectContent,
    typingSpeed = 100,
    delayBetween = 800,
    showCursor = false,
}: TypingEffectProps) {
    const [displayText, setDisplayText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const currentString = typingEffectContent[currentIndex];

        if (!isDeleting && charIndex <= currentString.length) {
            // Typing forward
            timeout = setTimeout(() => {
                setDisplayText(currentString.slice(0, charIndex));
                setCharIndex(charIndex + 1);
            }, typingSpeed);
        } else if (isDeleting && charIndex >= 0) {
            // Deleting
            timeout = setTimeout(() => {
                setDisplayText(currentString.slice(0, charIndex));
                setCharIndex(charIndex - 1);
            }, typingSpeed / 2);
        } else if (!isDeleting && charIndex > currentString.length) {
            // Pause before deleting
            timeout = setTimeout(() => {
                setIsDeleting(true);
                setCharIndex(charIndex - 1);
            }, delayBetween);
        } else if (isDeleting && charIndex < 0) {
            // Move to next string
            setIsDeleting(false);
            setCurrentIndex((currentIndex + 1) % typingEffectContent.length);
            setCharIndex(0);
        }

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, currentIndex, typingEffectContent, typingSpeed, delayBetween]);

    return (
        <div className="text-white text-lg md:text-xl font-medium">
            {baseContent} <span className="typing">{displayText}</span>
            {showCursor && <span className="blink">|</span>}

            <style jsx>{`
                .typing {
                    white-space: pre;
                }
                .blink {
                    display: inline-block;
                    width: 1ch;
                    animation: blink 1s step-start infinite;
                }
                @keyframes blink {
                    50% {
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
