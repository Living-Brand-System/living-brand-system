'use client'

import type { VectorPrimitive, VectorScene } from '@/modules/studio-artifact/studio-artifact'
// 🔑 `import type`이라 서버 전용 import(fs·fontkit)가 클라이언트 번들에 따라오지 않는다.
import type { OutlineTextResult } from '../services/outline-text.service'

/**
 * 씬의 글자를 윤곽선 path로 굽는다. 인쇄용 벡터의 마지막 단계다.
 *
 * 🔑 굽기를 워커가 아니라 여기서 하는 이유는 **서체 파일이 서버에 있어서**다. 워커는 화면을 재기만
 *    하고, 서체를 아는 것은 이 단계다(`/api/studio-exports/outline`).
 * 🔴 굽지 못한 글줄은 `text`로 남긴다 — 다른 서체로 대신 그리면 인쇄물이 조용히 틀린다.
 *    남은 것은 `notOutlined`로 돌려주므로 호출부가 경고하거나 래스터로 떨어뜨릴 수 있다.
 */
export type OutlineSceneResult = {
	scene: VectorScene
	notOutlined: readonly { text: string; fontFamily: string; reason: string }[]
}

type TextPrimitive = Extract<VectorPrimitive, { kind: 'text' }>

/**
 * 🔑 서버 타입을 그대로 쓴다 — 손으로 두 번 적으면 `reason` 유니온이 string으로 넓어져,
 *    서버가 이유를 하나 늘려도 타입으로 못 알아채고 원문이 화면에 새어 나간다.
 */
type OutlineResponse = { runs: OutlineTextResult[] }

export async function outlineVectorScene(scene: VectorScene): Promise<OutlineSceneResult> {
	const texts = collectText(scene.primitives)
	if (texts.length === 0) return { scene, notOutlined: [] }

	const response = await fetch('/api/studio-exports/outline', {
		body: JSON.stringify({
			runs: texts.map((text) => ({
				text: text.text,
				fontFamily: text.fontFamily,
				fontSize: text.fontSize,
				...(text.fontWeight === undefined ? {} : { fontWeight: text.fontWeight }),
				...(text.letterSpacing === undefined ? {} : { letterSpacing: text.letterSpacing }),
			})),
		}),
		headers: { 'Content-Type': 'application/json' },
		method: 'POST',
	})
	if (!response.ok) throw new Error('글자 윤곽선을 만들지 못했습니다.')
	const { runs } = (await response.json()) as OutlineResponse

	const outlines = new Map<TextPrimitive, OutlineResponse['runs'][number]>()
	texts.forEach((text, index) => {
		const run = runs[index]
		if (run) outlines.set(text, run)
	})
	const notOutlined = texts.flatMap((text) => {
		const run = outlines.get(text)
		return run && !run.outlined
			? [{ text: text.text, fontFamily: text.fontFamily, reason: run.reason }]
			: []
	})

	return {
		scene: { ...scene, primitives: replaceText(scene.primitives, outlines) },
		notOutlined,
	}
}

function collectText(primitives: readonly VectorPrimitive[]): TextPrimitive[] {
	return primitives.flatMap((primitive) => {
		if (primitive.kind === 'text') return [primitive]
		return primitive.kind === 'group' ? collectText(primitive.children) : []
	})
}

/** 글줄에서 나온 path. `x`·`y`는 우리가 반드시 넣으므로 선택이 아니다 — 이어 붙일 때 기준점이 된다. */
type OutlinedLine = Extract<VectorPrimitive, { kind: 'path' }> & { x: number; y: number }

/**
 * 글줄을 윤곽선 path로 바꾸면서 **한 문단을 한 path로 잇는다.**
 *
 * 🔴 워커는 문단을 **렌더된 줄 단위**로 쪼갠다(`getClientRects`가 곧 줄이다). 그대로 두면
 *    Illustrator에서 문단 하나가 줄 수만큼 오브젝트로 열린다 — 실측: poster의 `Description`이
 *    3개, `Slogan 2`가 2개로 쪼개져 Text 묶음이 총 8조각이었다.
 * 🔑 한 문단의 줄들은 워커가 같은 그룹의 **연이은 형제**로 내므로, 이어진 것만 이으면 문단이 된다.
 *    `mergeCompoundPaths`(SVG 자산)와 같은 규칙이다 — 사이에 다른 것이 끼면 잇지 않는다.
 *    이으면 그 사이 요소가 위아래로 뒤집히기 때문이다.
 */
function replaceText(
	primitives: readonly VectorPrimitive[],
	outlines: Map<TextPrimitive, OutlineResponse['runs'][number]>,
): VectorPrimitive[] {
	const replaced: VectorPrimitive[] = []
	// 🔴 방금 만든 글줄에만 잇는다. 원래부터 path였던 형제에 이으면 남의 도형을 문단에 끌어들인다.
	let line: OutlinedLine | null = null

	for (const primitive of primitives) {
		if (primitive.kind === 'group') {
			replaced.push({ ...primitive, children: replaceText(primitive.children, outlines) })
			line = null
			continue
		}
		const run = primitive.kind === 'text' ? outlines.get(primitive) : undefined
		if (primitive.kind !== 'text' || !run?.outlined) {
			replaced.push(primitive)
			line = null
			continue
		}
		const outlined = outlinePath(primitive, run)
		if (line && line.fill === outlined.fill && line.opacity === outlined.opacity) {
			// path는 첫 줄의 원점에 놓이므로, 뒷줄은 그만큼 옮겨서 이어 붙인다.
			line.d += ` ${translateOutlinePath(outlined.d, outlined.x - line.x, outlined.y - line.y)}`
			continue
		}
		replaced.push(outlined)
		line = outlined
	}
	return replaced
}

function outlinePath(
	text: TextPrimitive,
	run: Extract<OutlineResponse['runs'][number], { outlined: true }>,
): OutlinedLine {
	// 서버 path는 baseline이 원점인 지역 좌표다. 정렬은 실측 폭으로 여기서 옮긴다 —
	// `text-anchor`는 글자에만 있는 개념이라 path로 바뀌는 순간 사라진다.
	const anchorShift =
		text.textAnchor === 'middle' ? -run.width / 2 : text.textAnchor === 'end' ? -run.width : 0
	return {
		kind: 'path',
		d: run.d,
		fill: text.fill,
		...(text.opacity === undefined ? {} : { opacity: text.opacity }),
		x: text.x + anchorShift,
		y: text.y,
	}
}

/**
 * 아웃라인 path를 옮긴다.
 *
 * 🔴 **`pathToCubicSvg`가 낸 것에만 쓴다.** 그 생성기는 절대 좌표 `M`·`L`·`C`·`Z`만 내고 숫자를
 *    공백으로 끊는다는 것을 전제한다 — 상대 명령이나 호(`A`)가 섞인 임의의 SVG path에 쓰면
 *    경고 없이 어긋난다.
 * 🔑 글립 좌표는 `scale(s, -s)`로 이미 y가 씬과 같은 방향이라, 씬 좌표의 차이를 그대로 더하면 된다.
 */
export function translateOutlinePath(d: string, dx: number, dy: number): string {
	if (dx === 0 && dy === 0) return d
	return d.replace(/([MLC])([^MLCZ]+)/g, (_match, command: string, args: string) => {
		const moved = args
			.trim()
			.split(/\s+/)
			.map((value, index) => round(Number(value) + (index % 2 === 0 ? dx : dy)))
		return `${command}${moved.join(' ')}`
	})
}

/** 서버의 `round`와 같은 자리수 — 소수 둘째 자리는 인쇄 해상도 아래다. */
function round(value: number): string {
	return String(Math.round(value * 100) / 100)
}
