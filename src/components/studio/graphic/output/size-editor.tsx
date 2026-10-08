'use client'

import { ArrowsHorizontal, ArrowsVertical } from '@carbon/icons-react'
import { Controller, ControllerStack } from '@/components/shared/controller'
import {
	fitsPrintOutput,
	formatMillimeters,
	isPrintPpi,
	millimetersToPixels,
	type PrintPpi,
	pixelsToMillimeters,
} from '@/features/studio-export/print-policy'
import {
	CUSTOM_PRESET,
	matchOutputPreset,
	OUTPUT_MODES,
	OUTPUT_PRESETS,
	type OutputMode,
	presetSize,
} from './output-presets'

export type GraphicOutputSize = { width: number; height: number; ppi: PrintPpi }

type GraphicSizeProps = {
	mode: OutputMode
	size: GraphicOutputSize
	/** 크기·해상도를 바꾼다. 받아들일지는 부르는 쪽(프로파일 계약)이 정한다. */
	onResize: (next: GraphicOutputSize) => void
	/** 거부·입력 오류 안내 — 카드 아래 안내 줄에 남는다. */
	onNotice: (notice: string) => void
}

/** 출력 한도를 먼저 본다 — 한도 밖이면 바꾸지 않고 이유를 남긴다. */
function resizeWithin(
	{ size, onResize, onNotice }: GraphicSizeProps,
	patch: Partial<GraphicOutputSize>,
) {
	const next = { ...size, ...patch }
	if (!fitsPrintOutput(next.width, next.height))
		return onNotice('출력 가능한 크기를 초과했습니다. 이전 값을 유지합니다.')
	onResize(next)
}

/**
 * 그래픽 판 크기 — Mode(인쇄 계약이 있을 때만)·Preset·W/H. 🔑 저장값은 언제나 px이고, Print 모드는 같은 값을
 * mm로 보여 주고 받는다(환산은 `print-policy`가 소유). 프리셋 선택 상태는 따로 들지 않고 지금 크기에서 계산한다.
 */
export function GraphicSizeEditor({
	printable,
	onModeChange,
	...props
}: GraphicSizeProps & { printable: boolean; onModeChange: (mode: OutputMode) => void }) {
	const { mode, size, onNotice } = props
	const physical = mode === 'print'
	const unit = physical ? 'mm' : 'px'
	const dimension = (axis: 'width' | 'height') =>
		physical ? formatMillimeters(pixelsToMillimeters(size[axis], size.ppi)) : String(size[axis])
	return (
		<>
			{printable && (
				<Controller.Row label="Mode">
					<Controller.Segmented
						aria-label="출력 모드"
						options={OUTPUT_MODES}
						value={mode}
						onChange={onModeChange}
					/>
				</Controller.Row>
			)}
			<Controller.Row label="Preset">
				<Controller.Select
					options={[...OUTPUT_PRESETS[mode], CUSTOM_PRESET]}
					value={matchOutputPreset({ mode, ...size })}
					onChange={(next) => {
						// Custom은 크기를 그대로 두고 편집을 이어간다 — 이미 언제나 편집 가능하다.
						const key = OUTPUT_PRESETS[mode].find((item) => item.value === next)?.value
						if (!key) return
						const preset = presetSize(key)
						resizeWithin(props, {
							width: preset.width,
							height: preset.height,
							ppi: preset.ppi ?? size.ppi,
						})
					}}
				/>
			</Controller.Row>
			<ControllerStack
				labelDisplay="icon"
				items={(
					[
						{ id: 'width', label: '출력 너비', Icon: ArrowsHorizontal },
						{ id: 'height', label: '출력 높이', Icon: ArrowsVertical },
					] as const
				).map(({ id, label, Icon }) => ({
					id,
					label,
					icon: <Icon />,
					children: (
						<div className="flex min-w-0 flex-1 items-center justify-end gap-1 text-sm">
							<Controller.NumberInput
								key={`${mode}-${size[id]}-${size.ppi}`}
								min="0.1"
								step="any"
								className="w-full tabular-nums"
								value={dimension(id)}
								isValid={(next) => next > 0}
								onInvalid={() => onNotice('0보다 큰 숫자를 입력해 주세요.')}
								onCommit={(next) =>
									resizeWithin(props, {
										[id]: physical
											? millimetersToPixels(next, size.ppi)
											: Math.round(next),
									})
								}
							/>
							<span className="shrink-0 text-muted-foreground">{unit}</span>
						</div>
					),
				}))}
			/>
		</>
	)
}

/**
 * Print 모드의 해상도. 🔑 해상도를 바꿔도 판의 물리 크기(mm)는 지킨다 — 픽셀을 새 해상도로 다시 잡는다.
 * 프리셋 목록이 아니라 범위(1~1200)로 받는 숫자 칸이다(이미지·템플릿의 `StudioOutput.Print`와 다르다).
 */
export function GraphicResolution(props: GraphicSizeProps) {
	const { size, onNotice } = props
	const invalid = () => onNotice('해상도는 1~1200 ppi로 입력해 주세요.')
	return (
		<Controller.Row label="Resolution">
			<div className="flex min-w-0 items-center gap-1 text-sm">
				<Controller.NumberInput
					key={size.ppi}
					min="0.1"
					step="any"
					className="w-full tabular-nums"
					value={String(size.ppi)}
					isValid={(next) => next > 0}
					onInvalid={invalid}
					onCommit={(ppi) => {
						if (!isPrintPpi(ppi)) return invalid()
						resizeWithin(props, {
							ppi,
							width: millimetersToPixels(
								pixelsToMillimeters(size.width, size.ppi),
								ppi,
							),
							height: millimetersToPixels(
								pixelsToMillimeters(size.height, size.ppi),
								ppi,
							),
						})
					}}
				/>
				<span className="text-muted-foreground">ppi</span>
			</div>
		</Controller.Row>
	)
}
