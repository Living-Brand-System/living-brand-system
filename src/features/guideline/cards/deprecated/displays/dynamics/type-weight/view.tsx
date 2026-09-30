'use client'

import { controllerString } from '@/features/guideline/domain/controller-values'
import { useGuidelineController } from '@/features/guideline/hooks/use-guideline-controller'
import {
	AVAILABLE_WEIGHTS,
	BRAND_FONT_STACK,
	WEIGHTS,
	type WeightKey,
} from '../../../../displays/dynamics/brand-typeface'
import { WEIGHT } from '../../../../displays/dynamics/type-weight/manifest'

// 문구·크기·행간을 유지하고 카드 컨트롤에서 고른 굵기만 바꾼다.

/**
 * 표본 크기. 판 폭에 비례해 어느 셀에 놓여도 같은 그림이 나온다.
 * 🔴 `%`가 아니라 `cqi`인 이유: `%` 글꼴 크기는 부모 글꼴 기준이고, 판이 그리드 셀 안에 있으면
 *    폭 기준도 판이 아니라 셀이 된다. 판을 컨테이너로 선언해 판 기준으로 잰다.
 *    높이는 내용이 정하므로 `cqmax`가 아니라 인라인 축(`cqi`)만 쓴다.
 * 큰 글자 : 작은 글자 = 원본 Artboard 43의 36 : 20을 그대로 옮긴 비다.
 */
const TITLE_SIZE = 'clamp(1.25rem, 3.2cqi, 3rem)'
const BODY_SIZE = 'clamp(0.75rem, 1.78cqi, 1.5rem)'

export function TypeWeightView({
	title,
	body,
	titleLeading,
	bodyLeading,
	initialWeight,
}: {
	title: string
	body: string
	titleLeading: number
	bodyLeading: number
	initialWeight: WeightKey
}) {
	const { values } = useGuidelineController()
	const key = controllerString(
		values,
		WEIGHT.id,
		WEIGHTS.map((candidate) => candidate.key),
		initialWeight,
	)
	const weight = WEIGHTS.find((candidate) => candidate.key === key) ?? WEIGHTS[0]

	// 파일에 없는 굵기는 브라우저가 합성한다. 그 사실을 안 알리면 합성 자형을 규정 서체로 오해한다.
	const synthesized = !AVAILABLE_WEIGHTS.includes(weight.value)

	return (
		<div
			className="flex size-full min-h-0 min-w-0 flex-col gap-8 border border-border px-8 py-10"
			// 표본 크기가 셀이 아니라 이 판을 기준으로 잡히게 한다(TITLE_SIZE 주석 참고).
			style={{ containerType: 'inline-size' }}
		>
			<div className="flex flex-col gap-6">
				{/* 문구의 줄바꿈은 규정 표본 그대로다 — 폭에 따라 흘려보내면 원본과 행 수가 달라진다. */}
				<p
					className="whitespace-pre-line break-keep text-foreground"
					style={{
						fontFamily: BRAND_FONT_STACK,
						fontWeight: weight.value,
						fontSize: TITLE_SIZE,
						lineHeight: titleLeading,
					}}
				>
					{title}
				</p>
				{/* 굵기의 인상은 작은 글자에서 갈린다 — 같은 굵기를 본문 크기로 한 번 더 보여 준다. */}
				<p
					className="whitespace-pre-line break-keep text-foreground"
					style={{
						fontFamily: BRAND_FONT_STACK,
						fontWeight: weight.value,
						fontSize: BODY_SIZE,
						lineHeight: bodyLeading,
					}}
				>
					{body}
				</p>
			</div>

			<div className="flex flex-col gap-3">
				{/*
					안내와 경고가 같은 자리를 쓴다 — 굵기를 바꿀 때마다 줄이 생겼다 사라지면 판이 들썩인다.
					role="status"라 합성 경고가 스크린리더에도 전달된다.
				*/}
				<p
					role="status"
					className={`font-body text-xs ${
						synthesized ? 'text-destructive' : 'text-muted-foreground'
					}`}
				>
					{synthesized
						? `${weight.label}(${weight.value})는 아직 서체 파일에 없어 브라우저가 대신 그린 굵기입니다. 원본 자형과 다릅니다.`
						: '하단 컨트롤에서 굵기 3종을 비교해 보세요.'}
				</p>
			</div>
		</div>
	)
}

export default TypeWeightView
