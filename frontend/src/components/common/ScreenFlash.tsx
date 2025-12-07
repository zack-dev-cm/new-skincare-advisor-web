'use client';

import { useEffect, useState } from 'react';

export default function ScreenFlash() {
	const [animate, setAnimate] = useState(true);

	useEffect(() => {
		const timeout = setTimeout(() => setAnimate(false), 300);
		return () => clearTimeout(timeout);
	}, []);

	if (!animate) return null;

	return (
		<div
			className='fixed inset-0 z-[9999] pointer-events-none transition-all duration-300 ease-out'
			style={{
				background: 'white',
				opacity: 0.9,
				filter: 'blur(1px) brightness(1.8)',
			}}
		/>
	);
}
