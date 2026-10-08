'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Controller, ControllerPresence } from '@/components/shared/controller'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import type { StudioOutputView } from '@/features/studio-export/output-view'
import type { PrintPpi } from '@/features/studio-export/print-policy'
import { cn } from '@/lib/utils'

/**
 * 스튜디오 왼쪽 Output 카드의 공용 부품(docs/10 §3.7 Output 카드). 각 스튜디오가 자기 고유 행(크기·생성 입력·
 * 배율)과 이 부품을 조립한다. 무엇이 보일지는 export 훅의 `StudioOutputView`가 정하고(쓰지 않는 축은 `null`),
 * 부품은 받은 대로 그린다.
 */

/** 카드 틀 — 「Output」 제목, 행 목록(생기고 빠지는 행은 높이로 펼친다), 아래 저장·안내. */
function Root({
	children,
	footer,
	className,
	...props
}: ComponentProps<'section'> & { footer?: ReactNode }) {
	return (
		<section
			aria-label="출력 설정"
			data-slot="studio-output"
			className={cn('flex flex-col gap-4', className)}
			{...props}
		>
			<div className="flex flex-col">
				<Typography
					as="h2"
					size="sm"
					weight="semibold"
					tone="muted"
					className="flex h-9 items-center"
				>
					Output
				</Typography>
				{/* 제목 아래 행 사이 4px은 각 행의 위 여백이다 — 형식에 따라 생기는 행이 높이로 펼쳐진다. */}
				<ControllerPresence itemClassName="pt-1">{children}</ControllerPresence>
			</div>
			{footer}
		</section>
	)
}

function Format({ value, options, set }: StudioOutputView['format']) {
	return (
		<Controller.Row label="Format">
			<Controller.Select
				options={options.map((option) => ({ value: option, label: option.toUpperCase() }))}
				value={value ?? ''}
				onChange={(next) => set(next as (typeof options)[number])}
			/>
		</Controller.Row>
	)
}

/** 인쇄 해상도. 선택지가 하나뿐이면 읽기 전용 값으로 둔다. */
function Print({ ppi, options, set }: NonNullable<StudioOutputView['print']>) {
	return (
		<Controller.Row label="Resolution" readonly={options.length <= 1}>
			{options.length <= 1 ? (
				<span className="text-sm text-muted-foreground">{ppi}ppi</span>
			) : (
				<Controller.Select
					options={options.map((option) => ({
						value: String(option),
						label: `${option}ppi`,
					}))}
					value={String(ppi)}
					onChange={(next) => set(Number(next) as PrintPpi)}
				/>
			)}
		</Controller.Row>
	)
}

/** 영상 형식에만 필요한 FPS와 길이. 크기는 각 스튜디오의 크기 행이 소유한다. */
function Video({
	fps,
	fpsOptions,
	durationSeconds,
	maxDurationSeconds,
	setFps,
	setDuration,
}: NonNullable<StudioOutputView['video']>) {
	return (
		<div data-slot="studio-output-video" className="flex flex-col gap-1">
			<Controller.Row label="FPS" readonly={fpsOptions.length <= 1}>
				{fpsOptions.length <= 1 ? (
					<span className="text-sm text-muted-foreground">{fps}</span>
				) : (
					<Controller.Select
						options={fpsOptions.map((option) => ({
							value: String(option),
							label: String(option),
						}))}
						value={String(fps)}
						onChange={(next) => setFps(Number(next) as typeof fps)}
					/>
				)}
			</Controller.Row>
			<Controller.Row label="Duration">
				<div className="flex items-center gap-1 text-muted-foreground">
					<Controller.NumberInput
						inputMode="numeric"
						min={1}
						max={maxDurationSeconds}
						step={1}
						value={durationSeconds}
						placeholder="—"
						className="w-20 text-right"
						isValid={(next) =>
							Number.isInteger(next) && next >= 1 && next <= maxDurationSeconds
						}
						onCommit={setDuration}
					/>
					<span className="text-sm">sec</span>
				</div>
			</Controller.Row>
		</div>
	)
}

/**
 * 저장 — 결과가 한 장이면 「저장」 하나, 여러 장(Image)이면 「선택 저장」·「전체 저장」.
 * `action`은 저장 위에 놓는 결과를 만드는 동작(Image의 생성, Figma 529:19999).
 */
function Actions({
	save,
	busy,
	action,
}: Pick<StudioOutputView, 'save' | 'busy'> & { action?: ReactNode }) {
	return (
		<div data-slot="studio-output-actions" className="flex flex-col gap-3">
			{action}
			<div className="flex gap-2">
				{'all' in save ? (
					<>
						<Button
							disabled={busy || !save.selected.canExport}
							className="h-11 min-w-0 flex-1 rounded-lg"
							onClick={save.selected.run}
						>
							선택 저장
						</Button>
						<Button
							variant="muted"
							disabled={busy || !save.all.canExport}
							className="h-11 min-w-0 flex-1 rounded-lg text-foreground"
							onClick={save.all.run}
						>
							전체 저장
						</Button>
					</>
				) : (
					<Button
						disabled={busy || !save.canExport}
						className="h-11 min-w-0 flex-1 rounded-lg"
						onClick={save.run}
					>
						저장
					</Button>
				)}
			</div>
		</div>
	)
}

/** 실패(오류)와 알릴 것(안내). 안내는 한 줄로 잇는다. */
function Messages({ error, notices }: Pick<StudioOutputView, 'error' | 'notices'>) {
	return (
		<>
			{error && (
				<Typography role="alert" size="sm" className="text-destructive">
					{error}
				</Typography>
			)}
			{notices.length > 0 && (
				<Typography role="status" size="xs" tone="muted">
					{notices.join(' · ')}
				</Typography>
			)}
		</>
	)
}

export const StudioOutput = { Root, Format, Print, Video, Actions, Messages }
