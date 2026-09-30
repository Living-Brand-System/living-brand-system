import type { TypeWeightWidget as TypeWeightWidgetRow } from '@/payload-types'
import {
	AVAILABLE_WEIGHTS,
	BRAND_FONT_STACK,
	type LanguageKey,
	LEADING,
	WEIGHT_SAMPLE,
	WEIGHT_SAMPLE_BODY,
	WEIGHT_SLIDER_SAMPLE,
	WEIGHTS,
	type WeightKey,
} from '../../../../displays/dynamics/brand-typeface'
import { HAIRLINE_CELL } from '../../../../displays/dynamics/hairline'
import { TypeWeightView } from './view'

// 위젯(서버): 언어에 딸린 규정(표본 문구·행간)을 평면 값으로 풀어 뷰에 넘긴다.
// 런타임에 바뀌는 건 굵기 하나뿐이라 뷰는 그것만 쥔다.
//
// layout='specimen'은 컨트롤이 없는 한 칸짜리 판이라 뷰(클라이언트)로 내려보내지 않고 여기서 그린다.
// 🔴 3종을 늘어놓는 배치는 이 위젯이 하지 않는다 — 열과 행은 Block 소관이고, 위젯은 자기 칸만 채운다.
//
// 🔴 props 타입을 직접 선언한다 — payload-types.ts에 이 블록이 아직 없다(등록은 상위 몫).
export function TypeWeightWidget({
	layout,
	language,
	initialWeight,
}: {
	layout?: 'slider' | 'specimen' | null
	language?: LanguageKey | null
	initialWeight?: WeightKey | null
} = {}) {
	if (layout === 'specimen') {
		// 갤러리는 props 없이 렌더하므로 기본값으로도 화면이 서야 한다.
		return <TypeWeightSpecimen lang={language ?? 'ko'} weightKey={initialWeight ?? 'medium'} />
	}

	return (
		<TypeWeightView
			title={WEIGHT_SLIDER_SAMPLE.title}
			body={WEIGHT_SLIDER_SAMPLE.body}
			// 굵기만 비교하는 판이라 행간은 고정한다. 임의 값 대신 규정 하한을 쓴다 — 표본이 국·영문을
			// 섞은 한 덩어리라 국문 규정(Head 130% / Body 150%)을 따른다. 눈대중으로 정할 값이 아니다.
			titleLeading={LEADING.ko.head[0] / 100}
			bodyLeading={LEADING.ko.body[0] / 100}
			initialWeight={initialWeight ?? 'medium'}
		/>
	)
}

/**
 * 표본 크기. 칸 폭(cqi) 기준이라 몇 열짜리 블록에 놓든 큰 글자와 작은 글자의 비가 유지된다.
 * 원본 Artboard 43은 460px 폭 열에 36px / 20px을 썼다 — 그 비율을 그대로 옮긴 값이다.
 */
const TITLE_SIZE = 'clamp(1rem, 7.8cqi, 2.25rem)'
const BODY_SIZE = 'clamp(0.7rem, 4.3cqi, 1.25rem)'

/** 컨트롤 없이 굵기 하나를 큰 문구 + 작은 본문으로 보여 주는 한 칸. */
function TypeWeightSpecimen({ lang, weightKey }: { lang: LanguageKey; weightKey: WeightKey }) {
	const weight = WEIGHTS.find((candidate) => candidate.key === weightKey) ?? WEIGHTS[1]
	// 파일에 없는 굵기는 브라우저가 합성한다. 그 사실을 안 알리면 합성 자형을 규정 서체로 오해한다.
	const synthesized = !AVAILABLE_WEIGHTS.includes(weight.value)

	return (
		// 🔴 테두리를 스스로 그리지 않는다 — 맞붙인 그리드에서는 셀마다 테두리를 두면 맞닿은 자리가
		//    2px이 된다. 선은 배치(Block)가 그리고, 셀은 틈을 가리도록 불투명하기만 하면 된다.
		<div
			className={`flex size-full min-h-0 min-w-0 flex-col gap-6 px-6 py-8 ${HAIRLINE_CELL}`}
			// 글자 크기가 그리드 셀이 아니라 이 판을 기준으로 잡히게 한다(TITLE_SIZE 주석 참고).
			style={{ containerType: 'inline-size' }}
		>
			<span className="font-body text-muted-foreground text-sm uppercase tracking-wide">
				{weight.label}
			</span>

			{/* 문구의 줄바꿈은 규정 표본 그대로다 — 폭에 따라 흘려보내면 원본과 행 수가 달라진다. */}
			<p
				className="whitespace-pre-line break-keep text-foreground"
				style={{
					fontFamily: BRAND_FONT_STACK,
					fontWeight: weight.value,
					fontSize: TITLE_SIZE,
					lineHeight: LEADING[lang].head[0] / 100,
				}}
			>
				{WEIGHT_SAMPLE[lang]}
			</p>

			{/* 굵기의 인상은 작은 글자에서 갈린다 — 같은 굵기를 본문 크기로 한 번 더 보여 준다. */}
			<p
				className="whitespace-pre-line break-keep text-foreground"
				style={{
					fontFamily: BRAND_FONT_STACK,
					fontWeight: weight.value,
					fontSize: BODY_SIZE,
					lineHeight: LEADING[lang].body[0] / 100,
				}}
			>
				{WEIGHT_SAMPLE_BODY[lang]}
			</p>

			{synthesized ? (
				// 아래로 밀어 붙여 칸 높이가 달라도 경고가 같은 자리에 선다.
				<p className="mt-auto font-body text-destructive text-xs">
					{weight.label}({weight.value})는 아직 서체 파일에 없어 브라우저가 대신 그린
					굵기입니다.
				</p>
			) : null}
		</div>
	)
}

/** 카드 디스플레이 진입점 — 자기 행을 받아 뷰로 넘긴다. `displays/registry.render.tsx`가 부른다. */
export default function TypeWeightDisplay({ display }: { display: TypeWeightWidgetRow }) {
	return (
		<TypeWeightWidget
			layout={display.layout}
			language={display.language}
			initialWeight={display.initialWeight}
		/>
	)
}
