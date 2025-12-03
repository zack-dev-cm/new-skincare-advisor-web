import { Moon, Sun } from 'lucide-react';

interface Props {
	brightness: number;
}

export default function LightingBar({ brightness }: Props) {
    console.log(brightness)
	const steps = 7;
	const activeIndex = Math.floor(brightness * steps);

	const barWidth = 4.29;
	const barGap = barWidth * 1.5;
	const baseHeight = 14.29;
	const activeHeight = baseHeight * 1.3;
	const barRadius = 1.43;

	return (
		<div className='absolute top-[10px] left-0 right-0 z-10 flex justify-center pointer-events-none select-none'>
			<div className='flex items-center' style={{ gap: '6px' }}>
				<div
					className='flex items-center justify-center'
					style={{ height: `${activeHeight}px` }}
				>
					<Moon size={14} className='text-white opacity-70' />
				</div>

				<div
					className='flex items-center mx-2'
					style={{ gap: `${barGap}px`, height: `${activeHeight}px` }}
				>
					{[...Array(steps)].map((_, i) => {
						const isActive = i === activeIndex;
						const isLit = i <= activeIndex;

						const height = isActive ? activeHeight : baseHeight;
						const topOffset = (activeHeight - height) / 2;

						return (
							<div
								key={i}
								style={{
									width: `${barWidth}px`,
									height: `${height}px`,
									borderRadius: `${barRadius}px`,
									background: isLit ? '#FFFEFF' : '#FFFEFF7D',
									boxShadow: isLit
										? '0px 0.71px 5px 1.43px #FFFFFF69'
										: 'none',
									marginTop: `${topOffset}px`,
									marginBottom: `${topOffset}px`,
								}}
							/>
						);
					})}
				</div>

				<div
					className='flex items-center justify-center'
					style={{ height: `${activeHeight}px` }}
				>
					<Sun size={14} className='text-white' />
				</div>
			</div>
		</div>
	);
}
