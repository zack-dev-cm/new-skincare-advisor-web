'use client';

import { useEffect, useState } from 'react';

interface Props {
	count: number;
}

export default function CaptureCountdown({ count }: Props) {
	const [visible, setVisible] = useState(true);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		setVisible(false);
		setTimeout(() => {
			setVisible(true);
			setScale(1.6);
			setTimeout(() => setScale(1), 150);
		}, 10);
	}, [count]);

	return (
		<p
			className={`text-white text-[96px] font-bold drop-shadow-lg transition-all duration-300 ease-out ${
				visible ? 'opacity-100' : 'opacity-0'
			}`}
			style={{ transform: `scale(${scale})` }}
		>
			{count}
		</p>
	);
}
