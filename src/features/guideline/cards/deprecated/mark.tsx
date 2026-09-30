import type { CardData } from '@/features/guideline/domain/contract/display'
import { cn } from '@/lib/utils'

const MARK_STYLE: Record<
	Exclude<NonNullable<CardData['mark']>, 'none'>,
	{ symbol: string; label: string; className: string }
> = {
	do: { symbol: '✓', label: 'Do', className: 'text-success' },
	ok: { symbol: '△', label: 'OK', className: 'text-muted-foreground' },
	dont: { symbol: '✕', label: "Don't", className: 'text-destructive' },
}

export function CardMark({ mark }: { mark: CardData['mark'] }) {
	if (!mark || mark === 'none') return null
	const style = MARK_STYLE[mark]
	return (
		<span
			role="img"
			aria-label={style.label}
			className={cn(
				'absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-background/80 font-body text-base leading-none',
				style.className,
			)}
		>
			{style.symbol}
		</span>
	)
}
