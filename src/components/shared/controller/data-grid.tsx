'use client'

import { Add, TrashCan } from '@carbon/icons-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ControllerAction } from './action'
import { BARE_INPUT } from './classes'
import { useRowControl } from './row'

/**
 * 줄·칸으로 이루어진 텍스트 값을 격자로 편집한다.
 *
 * 🔑 킷은 **값의 뜻을 모른다** — 무엇이 라벨이고 무엇이 수치인지는 런타임이 정한다. 여기서는
 *    「줄이 행, 칸이 열」까지만 안다. 그래서 같은 격자가 어떤 표 데이터에도 선다.
 * 🔑 값이 여전히 문자열이라 계약도 control 값 타입도 넓어지지 않는다 — 격자와 입력창이 같은
 *    값을 보고, 한쪽을 고치면 다른 쪽이 바로 따라온다.
 * 🔴 읽을 때는 쉼표도 칸으로 보지만 쓸 때는 항상 탭이다. 붙여넣은 값이 한 번에 정규화된다.
 * 🔴 **열 수에 상한을 두지 않는다.** 예전에는 8열에서 잘랐는데, 그보다 넓은 표를 붙여넣은 뒤
 *    아무 칸이나 고치면 9열부터가 조용히 사라졌다 — 격자는 편집기지 검사기가 아니다.
 *    넓은 표는 가로로 스크롤해서 본다.
 */

/** 한 칸의 최소 폭. 열이 많아지면 칸이 좁아지다 못해 읽을 수 없게 되므로 여기서 멈추고 스크롤한다. */
const MIN_CELL = '3.5rem'

export function parseGrid(text: string): string[][] {
	return text
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map((line) => line.split(line.includes('\t') ? '\t' : ',').map((cell) => cell.trim()))
}

export function formatGrid(rows: readonly (readonly string[])[]): string {
	return rows.map((cells) => cells.join('\t')).join('\n')
}

type ControllerDataGridProps = {
	value: string
	onChange: (next: string) => void
	/** 열 제목. 없으면 첫 행이 곧 데이터라 제목 줄을 세우지 않는다. */
	columnLabels?: readonly string[]
	addRowLabel?: string
}

export function ControllerDataGrid({
	value,
	onChange,
	columnLabels,
	addRowLabel = '행 추가',
}: ControllerDataGridProps) {
	const row = useRowControl()
	const rows = parseGrid(value)
	// 가장 긴 줄이 열 수를 정한다 — 짧은 줄은 빈 칸으로 채워 격자가 어긋나지 않게 한다.
	const columns = Math.max(1, columnLabels?.length ?? 0, ...rows.map((cells) => cells.length))
	const disabled = row?.disabled || undefined
	const track = `repeat(${columns}, minmax(${MIN_CELL}, 1fr))`

	const write = (next: string[][]) => onChange(formatGrid(next))

	return (
		<div data-slot="controller-data-grid" className="flex flex-col gap-1">
			{/* 넓은 표는 제목 줄과 데이터 줄이 **함께** 움직여야 어느 칸이 무엇인지 유지된다. */}
			<div className="flex flex-col gap-1 overflow-x-auto">
				{columnLabels && columnLabels.length > 0 && (
					<div
						className="grid gap-1 pr-7 text-muted-foreground text-xs"
						style={{ gridTemplateColumns: track }}
					>
						{Array.from({ length: columns }, (_, column) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: 열은 자리 그 자체다(1열·2열).
								key={column}
								className="truncate px-2"
							>
								{columnLabels[column] ?? ''}
							</span>
						))}
					</div>
				)}
				{rows.map((cells, rowIndex) => (
					// 행의 정체성이 곧 자리다 — 값이 같은 행이 여럿일 수 있어 값으로는 가를 수 없고,
					// 값은 밖에서 오는 문자열이라 안정된 id를 붙일 자리가 없다.
					// 셀은 전부 제어 입력이라 재사용되어도 값이 어긋나지 않는다.
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: 위 주석의 근거대로 자리가 곧 정체성이다.
						key={`row-${rowIndex}`}
						className="grid items-center gap-1"
						style={{ gridTemplateColumns: `${track} 1.75rem` }}
					>
						{Array.from({ length: columns }, (_, column) => (
							<Input
								// biome-ignore lint/suspicious/noArrayIndexKey: 열은 자리 그 자체다(1열·2열).
								key={column}
								value={cells[column] ?? ''}
								disabled={disabled}
								aria-label={`${rowIndex + 1}행 ${columnLabels?.[column] ?? `${column + 1}열`}`}
								className={cn(
									BARE_INPUT,
									'h-7 bg-background px-2 text-left text-xs',
								)}
								onChange={(event) => {
									const next = rows.map((line) => [...line])
									while (next[rowIndex].length < columns) next[rowIndex].push('')
									next[rowIndex][column] = event.target.value
									write(next)
								}}
							/>
						))}
						<ControllerAction
							aria-label={`${rowIndex + 1}행 삭제`}
							disabled={disabled}
							onClick={() => write(rows.filter((_, index) => index !== rowIndex))}
						>
							<TrashCan aria-hidden />
						</ControllerAction>
					</div>
				))}
			</div>
			<button
				type="button"
				disabled={disabled}
				className={cn(
					'mt-0.5 flex h-7 items-center justify-center gap-1 rounded-md border border-border border-dashed text-muted-foreground text-xs',
					'hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50',
				)}
				onClick={() => write([...rows, Array.from({ length: columns }, () => '')])}
			>
				<Add aria-hidden />
				{addRowLabel}
			</button>
		</div>
	)
}
