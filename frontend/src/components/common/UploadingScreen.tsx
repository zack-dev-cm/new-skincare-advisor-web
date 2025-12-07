'use client';

import { useEffect, useState } from 'react';
import TypingEffect from './TypingEffect';
import RandomCircles from './RandomCircles';
import { getFaceFrameRect } from '@/lib/face-utils';

interface UploadingScreenProps {
  	imageUrl: string;
}

export default function UploadingScreen({ imageUrl }: UploadingScreenProps) {
	const [windowRect, setWindowRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
	const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		// set initial window size
		const handleResize = () => {
			setWindowSize({ width: window.innerWidth, height: window.innerHeight });
		};
		handleResize();
		window.addEventListener('resize', handleResize);

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	useEffect(() => {
		if (windowSize.width === 0 || windowSize.height === 0) return;

		// define safe area (top/bottom)
		const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) || 0;
		const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;

		const rect = getFaceFrameRect(
			windowSize,
			{ top: safeAreaTop, bottom: safeAreaBottom },
			{ width: windowSize.width, height: windowSize.height }
		);

		setWindowRect(rect.windowRect);
	}, [windowSize]);

	return (
		<div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center text-center overflow-hidden">
		{/* Darkened background image */}
		<img
			src={imageUrl}
			alt="Captured"
			className="absolute inset-0 w-full h-full object-cover brightness-50"
		/>

		{/* Full-screen scanner */}
		<div className="scanner" />

		{/* Random circles inside face */}
		{windowRect.width > 0 && windowRect.height > 0 && (
			<div
				className="absolute pointer-events-none"
				style={{
					left: windowRect.x + windowRect.width * 0.12,            
					top: windowRect.y - windowRect.height * 0.15,           
					width: windowRect.width * 0.76,                          
					height: windowRect.height * 0.9,                       
				}}
			>
				<RandomCircles
					numCircles={8} 
					minSize={4} 
					maxSize={8} 
					speed={0.7} 
					color="#0092FF" 
				/>
			</div>
		)}

	{/* Typing text overlay */}
	<div className="absolute z-40 text-white text-lg md:text-xl font-medium">
		<TypingEffect
			baseContent = "We are analyzing"
            typingEffectContent = {[
                "wrinkles...",
                "pores...",
                "eye area...",
                "pigmentation...",
                "acne...",
                "hydration...",
                "redness...",
                "translucency...",
                ""
            ]}
			typingSpeed={120}
			delayBetween={800}
		/>
	</div>

	<style jsx>{`
		.scanner {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			background: linear-gradient(
				to bottom,
				rgba(0, 146, 255, 0.0) 20%,
				rgba(0, 146, 255, 0.6) 100%
			);
			transform: translateY(-100%);
			animation: scanLoop 4s linear infinite;
		}

		@keyframes scanLoop {
			0% {
				transform: translateY(-100%);
				background: linear-gradient(
					to bottom,
					rgba(0, 146, 255, 0.0) 20%,
					rgba(0, 146, 255, 0.6) 100%
				);
			}
			40% {
				transform: translateY(100%);
				background: linear-gradient(
					to bottom,
					rgba(0, 146, 255, 0.0) 20%,
					rgba(0, 146, 255, 0.6) 100%
				);
			}
			50% {
				transform: translateY(100%);
				background: linear-gradient(
					to top,
					rgba(0, 146, 255, 0.0) 20%,
					rgba(0, 146, 255, 0.6) 100%
				);
			}
			90% {
				transform: translateY(-100%);
				background: linear-gradient(
					to top,
					rgba(0, 146, 255, 0.0) 20%,
					rgba(0, 146, 255, 0.6) 100%
				);
			}
			100% {
				transform: translateY(-100%);
				background: linear-gradient(
					to bottom,
					rgba(0, 146, 255, 0.0) 20%,
					rgba(0, 146, 255, 0.6) 100%
				);
			}
		}
	`}</style>
	</div>
  );
}
