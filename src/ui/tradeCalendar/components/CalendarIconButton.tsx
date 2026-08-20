import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';

export function CalendarIconButton({
	icon,
	label,
	onClick,
	variant = 'default',
}: {
	icon: string;
	label: string;
	onClick: () => void;
	variant?: 'default' | 'plain';
}) {
	const iconElRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!iconElRef.current) {
			return;
		}
		iconElRef.current.replaceChildren();
		setIcon(iconElRef.current, icon);
	}, [icon]);

	return (
		<button
			type="button"
			className={[
				'trader-journal-calendar__icon-button',
				variant === 'plain' ? 'trader-journal-calendar__icon-button--plain' : '',
			]
				.filter(Boolean)
				.join(' ')}
			aria-label={label}
			title={label}
			onClick={onClick}
		>
			<span ref={iconElRef} aria-hidden="true" />
		</button>
	);
}
