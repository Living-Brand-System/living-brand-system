'use client'

import { cn } from '@/lib/utils'
import { ControllerField } from './field'
import { useRowControl } from './row'

export type ControllerColorStripSwatch = {
	/** 이 칸이 대표하는 control의 id — 값 변경이 그 control로 돌아간다. */
	id: string
	/** 사람이 읽는 이름(광선 색상 1·배경 색상). 스크린리더가 칸을 구분하는 유일한 단서다. */
	label: string
	/** hex 색상(#rrggbb). 스타일이 아니라 데이터로 흐른다(docs/09 §4 예외). */
	value: string
	/** 아직 정해지지 않은 칸 — 검정을 사칭하지 않게 흐리게 그린다. */
	isEmpty?: boolean
}

type ControllerColorStripProps = {
	label: string
	swatches: readonly ControllerColorStripSwatch[]
	onChange?: (id: string, hex: string) => void
	/** 띠 전체를 원래 색으로 되돌린다 — 조합이 한 단위이므로 되돌리기도 한 단위다. */
	onReset?: () => void
	disabled?: boolean
}

/**
 * 색 조합을 한 띠로 보여 주는 컨트롤 — 칸마다 하나의 색 control이 앉는다.
 *
 * 🔑 색 control을 행으로 쌓으면 정보인 색이 20px 점이 되고 hex 글자가 화면을 채운다. 조합은
 *    **한눈에 비교되어야** 하는 축이라 칸을 키워 나란히 놓고 hex는 지운다(값은 각 칸의 title에
 *    남는다). 개별 색을 정확히 입력해야 하는 자리는 여전히 `ColorRow`다.
 *
 * `color-chips.tsx`와 다르다: 거기는 **미리 정해진 조합 중 하나를 고르고**, 여기는 **조합을 이룬
 * 색들을 각각 바꾼다**. 둘을 합치지 말 것 — 고르기와 편집은 다른 조작이다.
 */
export function ControllerColorStrip({
	label,
	swatches,
	onChange,
	onReset,
	disabled,
}: ControllerColorStripProps) {
	return (
		<ControllerField
			label={label}
			disabled={disabled}
			action={
				onReset && (
					<button
						type="button"
						aria-label={`${label} 원래 색으로 되돌리기`}
						onClick={onReset}
						className="rounded-sm text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
					>
						초기화
					</button>
				)
			}
		>
			<StripSwatches swatches={swatches} onChange={onChange} />
		</ControllerField>
	)
}

/** 배선(disabled)은 Field 안쪽에서만 보이므로 칸들을 자식 컴포넌트로 내린다. */
function StripSwatches({
	swatches,
	onChange,
}: Pick<ControllerColorStripProps, 'swatches' | 'onChange'>) {
	const row = useRowControl()
	return (
		<div data-slot="controller-color-strip" className="flex items-stretch gap-1">
			{swatches.map((swatch) => (
				<input
					key={swatch.id}
					type="color"
					aria-label={`${swatch.label} 색상 선택`}
					title={`${swatch.label} · ${swatch.isEmpty ? '미설정' : swatch.value}`}
					value={swatch.value}
					disabled={row?.disabled || undefined}
					onChange={(event) => onChange?.(swatch.id, event.target.value)}
					className={cn(
						'h-10 min-w-0 flex-1 cursor-pointer appearance-none rounded-sm border border-border bg-transparent p-0 disabled:cursor-not-allowed',
						'[&::-webkit-color-swatch]:rounded-[inherit] [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0',
						'focus-visible:ring-2 focus-visible:ring-ring/30',
						swatch.isEmpty && 'opacity-30',
					)}
				/>
			))}
		</div>
	)
}
