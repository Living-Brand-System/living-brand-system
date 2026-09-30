'use client'

import { Renew } from '@carbon/icons-react'
import { useState } from 'react'
import { GuidelineCardActions } from './card-actions'
import { GuidelineColorSwatch, GuidelineLogoBackgroundDisplay } from './color-displays'
import { GuidelineSection, GuidelineSectionHeading } from './components'
import { type GuidelineCardData, GuidelineDisplayFrame, GuidelineGridContainer } from './grid'
import { GuidelineCiLockupDisplay } from './guide-displays'
import { GuidelineTypeWeightAdjustableDisplay } from './type-weight-display'

const CI_STAGES = [
	{ id: 'group', label: '본사' },
	{ id: 'subsidiary', label: '계열사' },
	{ id: 'branch', label: '해외지사' },
] as const

function CiBreadcrumbDisplay({ colors }: { colors: Record<string, string> }) {
	const [stage, setStage] = useState(2)
	return (
		<GuidelineCiLockupDisplay
			colors={colors}
			fixed={{ subsidiaryOn: stage >= 1, branchOn: stage >= 2 }}
			breadcrumb={{
				kind: 'breadcrumb',
				label: 'CI 조합 단계',
				items: CI_STAGES.slice(0, stage + 1),
				onNavigate: (id) => {
					const index = CI_STAGES.findIndex((item) => item.id === id)
					if (index >= 0) setStage(index)
				},
			}}
			end={{
				kind: 'button',
				label: 'CI 조합 초기화',
				icon: <Renew size={17} />,
				onClick: () => setStage(2),
			}}
		/>
	)
}

export function GuidelineActionVocabularyPlayground({
	colors: palette,
}: {
	colors: Record<string, string>
}) {
	const colors = ['HD HERITAGE GREEN', 'HD DISCOVERY BLUE', 'HD ECO GREEN']
		.filter((label) => /^#[0-9a-f]{6}$/i.test(palette[label] ?? ''))
		.map((label) => ({ label: label.replace('HD ', ''), value: palette[label] }))
	const cards: GuidelineCardData[] = [
		{
			id: 'ci-breadcrumb',
			ratio: '1:1',
			display: <CiBreadcrumbDisplay colors={palette} />,
			caption: {
				title: 'CI 조합 단계 · CENTER',
				description:
					'앞 단계를 누르면 해당 단계의 조합으로 돌아갑니다. 우측 초기화로 전체 조합을 복원합니다. 단계별 구성 예시이며 실제 조직 관계를 의미하지 않습니다.',
			},
		},
		{
			id: 'multi-toggle',
			ratio: '1:1',
			display: <GuidelineTypeWeightAdjustableDisplay />,
			caption: {
				title: '다중 선택 · CENTER',
				description:
					'Light / Medium / Bold. 기존 공통 토글을 사용하며 Medium으로 시작합니다.',
			},
		},
		{
			id: 'copy',
			ratio: '1:1',
			display: (
				<GuidelineDisplayFrame>
					<div className="absolute inset-6 flex items-center justify-center text-2xl">
						HD현대
					</div>
					<GuidelineCardActions
						end={{ kind: 'copy', label: '브랜드명 복사', value: 'HD현대' }}
					/>
				</GuidelineDisplayFrame>
			),
			caption: {
				title: '복사 · END',
				description:
					'브랜드명을 복사합니다. 실행 결과에 따라 복사 완료 또는 실패 안내가 표시됩니다.',
			},
		},
	]
	if (colors.length)
		cards.push(
			{
				id: 'copy-items',
				ratio: '1:1',
				display: (
					<GuidelineDisplayFrame>
						<div className="absolute inset-0 flex">
							{colors.map((color) => (
								<GuidelineColorSwatch key={color.value} color={color} />
							))}
						</div>
						<GuidelineCardActions
							end={{
								kind: 'copy',
								label: '모든 색상값 복사',
								value: colors
									.map((color) => `${color.label}: ${color.value}`)
									.join('\n'),
							}}
						/>
					</GuidelineDisplayFrame>
				),
				caption: {
					title: '항목별 복사',
					description: '색상 항목은 해당 값만, 우측 상단 액션은 전체 목록을 복사합니다.',
				},
			},
			{
				id: 'color',
				ratio: '1:1',
				display: (
					<GuidelineLogoBackgroundDisplay
						colors={colors}
						logos={{
							black: '/brand/hd/ko-horizontal-default-blk@2x.png',
							white: '/brand/hd/ko-horizontal-default-wht@2x.png',
						}}
					/>
				),
				caption: {
					title: '색상 액션 그룹 · END',
					description:
						'프리셋 또는 직접 입력한 색상을 배경에 적용합니다. 선택한 색상은 100%, 나머지는 30% 불투명도로 표시합니다. 초기화는 첫 프리셋으로 복원합니다.',
				},
			},
		)
	return (
		<GuidelineSection id="action-vocabulary" hierarchy="main">
			<GuidelineSectionHeading
				id="action-vocabulary-heading"
				hierarchy="main"
				title="Action Vocabulary Playground"
				description="START는 상태, CENTER는 전환, END는 실행 액션입니다. 복사와 색상 선택을 직접 확인하세요."
			/>
			{colors.length === 0 && (
				<p>브랜드 색상이 등록되면 항목별 복사와 색상 선택 예시가 표시됩니다.</p>
			)}
			<GuidelineGridContainer cards={cards} columns={2} displayWidth={480} />
		</GuidelineSection>
	)
}
