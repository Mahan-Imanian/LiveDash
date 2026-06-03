export interface SelectBoxProps {
	options: Array<{ value: string; label: string; disabled?: boolean }>
	optionalText?: string
	onChange?: (value: any) => void
	value?: string
	className?: string
	optionClassName?: string
	disabled?: boolean
}

export function SelectBox({
	options,
	value,
	onChange,
	className,
	optionClassName,
	disabled,
}: SelectBoxProps) {
	return (
		<select
			value={value}
			disabled={disabled}
			onChange={(e) => onChange?.(e.target.value)}
			className={`select select-xs text-[10px] w-[5.5rem] !px-3 rounded-xl !outline-none !shadow-none text-muted bg-base-300 cursor-pointer truncate ${className || ''}`}
			style={{
				backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
				backgroundPosition: 'right 0.7rem center',
				backgroundRepeat: 'no-repeat',
				backgroundSize: '1.2em 1.2em',
				paddingRight: '2.4rem',
			}}
		>
			{options.map((opt) => (
				<option
					key={opt.value}
					value={opt.value}
					disabled={opt.disabled}
					className={`text-muted ${optionClassName || ''}`}
				>
					{opt.label}
				</option>
			))}
		</select>
	)
}
