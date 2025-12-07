'use client';

import { Check } from 'lucide-react';

interface Props {
	isPerfectAlignment: boolean;
	safeAreaBottom?: number;
	center: { x: number; y: number };
}

export default function NoseAlignmentOverlay({ isPerfectAlignment, safeAreaBottom = 0, center }: Props) {
	return (
		<div
			className='absolute z-30 pointer-events-none'
			style={{
				left: center.x,
				top: center.y,
				transform: `translate(-50%, -50%)${safeAreaBottom ? ` translateY(-${safeAreaBottom / 2}px)` : ''}`,
				position: 'absolute',
			}}
		>
			<div
				className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
					isPerfectAlignment
						? 'border-green-500 bg-green-500/20'
						: 'border-white bg-white/20'
				}`}
			>
				{isPerfectAlignment && (
					<Check size={16} className='text-white' />
				)}
			</div>
		</div>
	);
}
