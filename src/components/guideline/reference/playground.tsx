'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import {
	ReferenceCard,
	ReferenceGrid,
	ReferenceHeader,
	ReferenceImage,
	ReferencePage,
	ReferenceSection,
} from './components'
import { identityCards } from './examples'

const defaults = {
	width: '100%',
	columns: '3',
	ratio: '1:1',
	caption: 'below',
	mark: 'none',
	layout: 'grid',
} as const
const options = {
	width: {
		label: '표면 너비',
		values: [
			['100%', '반응형'],
			['390px', '모바일 · 390'],
			['768px', '태블릿 · 768'],
			['1440px', '데스크톱 · 1440'],
		],
	},
	columns: {
		label: '열 수',
		values: [
			['1', '1열'],
			['2', '2열'],
			['3', '3열'],
		],
	},
	ratio: {
		label: '도판 비율',
		values: [
			['1:1', '정사각'],
			['16:9', '가로형'],
			['9:16', '세로형'],
		],
	},
	caption: {
		label: '캡션',
		values: [
			['below', '도판 아래'],
			['overlay', '도판 위'],
			['hidden', '숨김'],
		],
	},
	mark: {
		label: '판정 표식',
		values: [
			['none', '없음'],
			['do', 'Do'],
			['ok', 'OK'],
			['dont', 'Don’t'],
		],
	},
	layout: {
		label: '배치',
		values: [
			['grid', '그리드'],
			['carousel', '가로 스크롤'],
		],
	},
} as const

type Settings = Record<keyof typeof defaults, string>
export function ReferencePlayground() {
	const [settings, setSettings] = useState<Settings>(defaults)
	const query = new URLSearchParams({ ...settings, preview: '1' })
	return (
		<main
			data-slot="reference-playground"
			className="min-h-svh bg-background p-4 text-foreground md:p-8"
		>
			<div className="mx-auto flex max-w-7xl flex-col gap-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<Typography as="h1" size="2xl" weight="semibold">
							가이드라인 컴포넌트
						</Typography>
						<Typography tone="muted">
							헤더 · 섹션 · 카드 · 디스플레이를 같은 부품으로 확인합니다.
						</Typography>
					</div>
					<Button asChild variant="outline">
						<Link href="/guideline/reference">Corporate Identity 보기</Link>
					</Button>
				</div>
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
					{Object.entries(options).map(([key, option]) => (
						<label key={key} className="flex flex-col gap-2 font-medium text-sm">
							{option.label}
							<select
								className="h-10 rounded-md border border-input bg-background px-3 focus-visible:outline-2 focus-visible:outline-ring"
								value={settings[key as keyof Settings]}
								onChange={(event) =>
									setSettings((current) => ({
										...current,
										[key]: event.target.value,
									}))
								}
							>
								{option.values.map(([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								))}
							</select>
						</label>
					))}
				</div>
				<div className="flex items-center gap-4">
					<Button variant="outline" onClick={() => setSettings(defaults)}>
						초기화
					</Button>
					<Typography size="sm" tone="muted">
						변경값은 저장되지 않습니다. 판정 표식은 표현 예시입니다.
					</Typography>
				</div>
			</div>
			<div className="mt-8 overflow-x-auto rounded-xl border border-border p-2">
				<iframe
					title="새 가이드라인 컴포넌트 미리보기"
					src={`/guideline/reference/playground?${query}`}
					style={{ width: settings.width }}
					className="mx-auto block h-[1100px] border-0"
				/>
			</div>
		</main>
	)
}

export function ReferencePreview({
	params,
}: {
	params: Record<string, string | string[] | undefined>
}) {
	const read = (key: keyof Settings) =>
		options[key].values.some(([value]) => value === params[key])
			? (params[key] as string)
			: defaults[key]
	const columns = Number(read('columns')) as 1 | 2 | 3
	const ratio = read('ratio') as '1:1' | '16:9' | '9:16'
	const mark = read('mark') as 'none' | 'do' | 'ok' | 'dont'
	const caption = read('caption')
	const layout = read('layout') as 'grid' | 'carousel'
	return (
		<ReferencePage>
			<ReferenceHeader title="Corporate Identity" description="컴포넌트 미리보기" />
			<ReferenceSection
				id="preview-signature"
				title="Brand Signature"
				description="동일한 카드로 배치, 캡션, 비율과 표식을 확인합니다."
				align="center"
			>
				<ReferenceGrid columns={columns} layout={layout}>
					{identityCards.map((card) => (
						<ReferenceCard
							key={card.id}
							ratio={ratio}
							mark={mark}
							caption={caption === 'hidden' ? undefined : card.caption}
							captionPlacement={caption === 'overlay' ? 'overlay' : 'below'}
						>
							<ReferenceImage {...card.image} />
						</ReferenceCard>
					))}
				</ReferenceGrid>
			</ReferenceSection>
		</ReferencePage>
	)
}
