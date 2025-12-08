'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import NoseAlignmentOverlay from './NoseAlignmentOverlay';
import { getFaceFrameRect } from '@/lib/face-utils';

interface Props {
	hasFace: boolean;
	isCentered: boolean;
	zoomStatus: 'too-close' | 'too-far' | 'perfect';
	isPerfectAlignment: boolean;
	windowSize: { width: number; height: number };
	processId?: string;
}

export default function FaceFrameOverlay({
	hasFace,
	isCentered,
	zoomStatus,
	isPerfectAlignment,
	windowSize,
	processId,
}: Props) {
	const [textPosition, setTextPosition] = useState('3vh');
	const textRef = useRef<HTMLParagraphElement>(null);

	const [debouncedShowRectangle, setDebouncedShowRectangle] = useState(
		hasFace && !isCentered
	);
	const [debouncedShowOval, setDebouncedShowOval] = useState(
		hasFace && isCentered
	);
	const [ovalTracked, setOvalTracked] = useState(false);

	const [textState, setTextState] = useState<string | null>('');
	const [isStationary, setIsStationary] = useState(false);
	const [isTextHighlighted, setIsTextHighlighted] = useState(false);
	
	const stationaryTimerRef = useRef<NodeJS.Timeout | null>(null);
	const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
	const stationaryTimeRef = useRef<number>(0);
	const pulseCountRef = useRef<number>(0);

	const [safeAreaTop, setSafeAreaTop] = useState(0);
	const [safeAreaBottom, setSafeAreaBottom] = useState(0);

	const { windowRect } = getFaceFrameRect(
		windowSize,
		{ top: safeAreaTop, bottom: safeAreaBottom },
		{ width: windowSize.width, height: windowSize.height } 
	);

	const [debouncedShowNoseOverlay, setDebouncedShowNoseOverlay] = useState(
		hasFace && isCentered && zoomStatus === 'perfect'
	);

	const debouncedSetRectangle = useMemo(
		() =>
			debounce((show: boolean) => {
				setDebouncedShowRectangle(show);
			}, 200),
		[]
	);

	const debouncedSetOval = useMemo(
		() =>
			debounce((show: boolean) => {
				setDebouncedShowOval(show);
			}, 200),
		[]
	);

	const debouncedSetNoseOverlay = useMemo(
		() =>
			debounce((show: boolean) => {
				setDebouncedShowNoseOverlay(show);
			}, 200),
		[]
	);

	const debouncedSetText = useMemo(
		() =>
			debounce((newText: string) => {
				setTextState(newText);
			}, 180),
		[]
	);

	const getSafeAreaInset = (side: 'top' | 'bottom') => {
		if (typeof window === 'undefined') return 0;
		const div = document.createElement('div');
		div.style.position = 'absolute';
		if (side === 'top') {
			div.style.top = '0px';
			div.style.height = 'env(safe-area-inset-top)';
		} else {
			div.style.bottom = '0px';
			div.style.height = 'env(safe-area-inset-bottom)';
		}
		document.body.appendChild(div);
		const computed = window.getComputedStyle(div);
		const value = parseInt(computed.height, 10) || 0;
		document.body.removeChild(div);
		return value;
	};

	useEffect(() => {
		stationaryTimeRef.current = 0;
		setIsStationary(false);
		setIsTextHighlighted(false);
		
		if (stationaryTimerRef.current) {
			clearInterval(stationaryTimerRef.current);
			stationaryTimerRef.current = null;
		}
		
		if (hasFace && !isPerfectAlignment) {
			stationaryTimerRef.current = setInterval(() => {
				stationaryTimeRef.current += 100;
				if (stationaryTimeRef.current >= 2000) {
					setIsStationary(true);
					if (stationaryTimerRef.current) {
						clearInterval(stationaryTimerRef.current);
					}
				}
			}, 100);
		}
		
		return () => {
			if (stationaryTimerRef.current) {
				clearInterval(stationaryTimerRef.current);
			}
		};
	}, [hasFace, isCentered, zoomStatus, isPerfectAlignment]);
	
	useEffect(() => {
		if (highlightTimerRef.current) {
			clearInterval(highlightTimerRef.current);
			highlightTimerRef.current = null;
		}
		
		pulseCountRef.current = 0;
		
		if (isStationary && !isPerfectAlignment) {
			highlightTimerRef.current = setInterval(() => {
				setIsTextHighlighted(prev => !prev);
				pulseCountRef.current += 1;
				
				if (pulseCountRef.current >= 6) {
					if (highlightTimerRef.current) {
						clearInterval(highlightTimerRef.current);
					}
					setIsStationary(false);
					setIsTextHighlighted(false);
				}
			}, 250);
		}
		
		return () => {
			if (highlightTimerRef.current) {
				clearInterval(highlightTimerRef.current);
			}
		};
	}, [isStationary, isPerfectAlignment]);

	useEffect(() => {
		debouncedSetRectangle(hasFace && !isCentered);
		debouncedSetOval(hasFace && isCentered);
		debouncedSetNoseOverlay(hasFace && isCentered && zoomStatus === 'perfect');

		const getText = () => {
			if (!hasFace) return '';
			if (!isCentered) return 'Place your face in the frame';
			if (zoomStatus === 'too-far') return 'Move closer.';
			if (zoomStatus === 'too-close') return 'Move away.';
			if (!isPerfectAlignment)
				return 'Align your nose with the target circle.';
			return 'Perfect!';
		};

		const newText = getText();
		debouncedSetText(newText);

		return () => {
			debouncedSetRectangle.cancel();
			debouncedSetOval.cancel();
			debouncedSetNoseOverlay.cancel();
			debouncedSetText.cancel();
		};
	}, [
		hasFace,
		isCentered,
		zoomStatus,
		isPerfectAlignment,
		debouncedSetRectangle,
		debouncedSetOval,
		debouncedSetNoseOverlay,
		debouncedSetText,
	]);

	useEffect(() => {
		setSafeAreaTop(getSafeAreaInset('top'));
		setSafeAreaBottom(getSafeAreaInset('bottom'));
	}, [windowSize]);

	// Track when oval loads
	useEffect(() => {
		if (debouncedShowOval && !ovalTracked) {
			setOvalTracked(true);
		}
	}, [debouncedShowOval, ovalTracked, processId]);

	useEffect(() => {
		const vh = windowSize.height;
		const frameBottom = windowRect.y + windowRect.height;
		const screenBottom = vh - safeAreaBottom;
		let textHeight = 40;
		if (textRef.current) {
			textHeight = textRef.current.offsetHeight || 40;
		}
		const halfWay = frameBottom + (screenBottom - frameBottom) / 2;
		setTextPosition(`${halfWay - textHeight / 2}px`);
	}, [windowRect, windowSize.height, safeAreaBottom]);

	return (
		<>
			<div
				className={`absolute inset-0 z-10 flex items-center justify-center pointer-events-none transition-opacity ${
					debouncedShowRectangle
						? 'opacity-100 duration-500 delay-100'
						: 'opacity-0 duration-200'
				}`}
			>
				<div
					className='border-4 border-white rounded-3xl'
					style={{
						width: `${windowRect.width}px`,
						height: `${windowRect.height}px`,
						position: 'absolute',
						top: `${windowRect.y}px`,
						left: `${windowRect.x}px`,
					}}
				/>
			</div>

			<div
				className={`absolute inset-0 z-10 pointer-events-none transition-opacity ${
					debouncedShowOval
						? 'opacity-100 duration-500 delay-100'
						: 'opacity-0 duration-200'
				}`}
			>
				<svg width='100%' height='100%' className='absolute inset-0'>
					<defs>
						<mask id='oval-mask'>
							<rect width='100%' height='100%' fill='white' />
							<ellipse
								cx={windowRect.x + windowRect.width / 2}
								cy={windowRect.y + windowRect.height / 2}
								rx={windowRect.width / 2}
								ry={windowRect.height / 2}
								fill='black'
							/>
						</mask>
					</defs>

					<rect
						width='100%'
						height='100%'
						fill='black'
						opacity='0.4'
						mask='url(#oval-mask)'
					/>

					<ellipse
						cx={windowRect.x + windowRect.width / 2}
						cy={windowRect.y + windowRect.height / 2}
						rx={windowRect.width / 2}
						ry={windowRect.height / 2}
						fill='none'
						stroke={isPerfectAlignment ? '#00FF00' : 'white'}
						strokeWidth='2.5'
						style={{
							transition: 'stroke 0.3s ease',
						}}
					/>
				</svg>
			</div>

			{debouncedShowNoseOverlay && (
				<NoseAlignmentOverlay 
					isPerfectAlignment={isPerfectAlignment} 
					safeAreaBottom={safeAreaBottom}
					center={{
						x: windowRect.x + windowRect.width / 2,
						y: windowRect.y + windowRect.height * 2 / 3,
					}}
				/>
			)}

			<div 
				className='absolute z-20 left-0 right-0 w-full flex justify-center pointer-events-none transition-all duration-300'
				style={{
					position: 'absolute',
					top: textPosition,
				}}
			>
				<p 
					ref={textRef}
					className={`text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 text-center max-w-[90%]`}
					style={{
						fontSize: 'clamp(1rem, 5vw, 1.25rem)',
						transform: isTextHighlighted ? 'scale(1.1)' : 'scale(1)',
					}}
				>
					{textState}
				</p>
			</div>
		</>
	);
}