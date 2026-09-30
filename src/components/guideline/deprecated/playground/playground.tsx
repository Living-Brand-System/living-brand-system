'use client'

import { useState } from 'react'
import { ContentFrame } from '@/components/shared/content-frame'
import { ContentHeading } from '@/components/shared/content-heading'
import { ControllerRow } from '@/components/shared/controller/row'
import { ControllerSelect } from '@/components/shared/controller/select'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { PLAYGROUND_DEFAULTS, PLAYGROUND_OPTIONS, type PlaygroundSettings } from './settings'

type GuidelinePlaygroundProps = { examples: { value: string; label: string }[] }
const LABELS = {
	width: '화면 너비',
	layout: '배치',
	columns: '최대 열 수',
	count: '카드 수',
	ratio: '카드 비율',
}

export function GuidelinePlayground({ examples }: GuidelinePlaygroundProps) {
	const [widget, setWidget] = useState(examples[0]?.value ?? '')
	const [settings, setSettings] = useState(PLAYGROUND_DEFAULTS)
	const query = new URLSearchParams({ ...settings, widget, preview: '1' })
	const src = `/guideline/playground?${query}`
	return (
		<main data-slot="guideline-playground" className="min-h-svh py-8">
			<ContentFrame className="flex flex-col gap-6">
				<ContentHeading
					title="가이드라인 플레이그라운드"
					size="2xl"
					description="실제 카드와 위젯을 화면 크기별로 확인합니다. 변경값은 저장되지 않습니다."
				/>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
					<ControllerRow label="위젯">
						<ControllerSelect options={examples} value={widget} onChange={setWidget} />
					</ControllerRow>
					{Object.entries(PLAYGROUND_OPTIONS).map(([key, options]) => (
						<ControllerRow
							key={key}
							label={LABELS[key as keyof PlaygroundSettings]}
							disabled={key === 'columns' && settings.layout === 'carousel'}
						>
							<ControllerSelect
								options={options}
								value={settings[key as keyof PlaygroundSettings]}
								onChange={(value) =>
									setSettings((current) => ({ ...current, [key]: value }))
								}
							/>
						</ControllerRow>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<Button
						variant="outline"
						onClick={() => {
							setSettings(PLAYGROUND_DEFAULTS)
							setWidget(examples[0]?.value ?? '')
						}}
					>
						초기화
					</Button>
					<Button variant="outline" asChild>
						<a href={src} target="_blank" rel="noreferrer">
							미리보기 새 탭
						</a>
					</Button>
					<Typography size="sm" tone="muted">
						미리보기는 표시된 너비를 유지합니다. 위젯에 고유 비율이 있으면 카드 비율보다
						우선합니다.
					</Typography>
				</div>
			</ContentFrame>
			<div className="w-full overflow-x-auto p-4" data-slot="playground-viewport">
				<iframe
					title="가이드라인 카드 미리보기"
					src={src}
					style={{ width: Number(settings.width) }}
					className="mx-auto block h-[900px] shrink-0 rounded-3xl bg-background outline outline-border"
				/>
			</div>
		</main>
	)
}
