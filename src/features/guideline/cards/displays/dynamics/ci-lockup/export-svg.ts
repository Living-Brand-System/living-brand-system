'use client'

import { FONT, INK_BASELINE } from './rules'

/*
 * 화면에 떠 있는 락업을 그대로 SVG 파일로 내보낸다. 팀 공유용이라 **지금 보이는 것**이 정답이고,
 * 치수·여백 가이드 같은 주석은 담지 않는다(로고가 아니라 설명이므로).
 *
 * 🔑 좌표를 다시 계산하지 않고 **렌더된 DOM을 한 번 잰다.** 이 리포는 글자 폭을 계산하지 않으므로
 *    (`rules.ts` FONT 주석) 락업의 최종 좌표는 레이아웃만 알고 있다. 내보내기는 한 번만 일어나는
 *    동작이라 재는 비용도, 전환과 얽힐 위험도 없다 — 애니메이션이 도는 중에 눌러도 그 순간의
 *    화면이 나가는 것이 맞다.
 * 🔴 그래서 이 파일은 **모양을 정하지 않는다.** 규정은 `rules.ts`, 렌더는 `view.tsx`가 갖고,
 *    여기는 그 결과를 옮겨 적는 일만 한다.
 */

/** 🔴 정본 서체가 오면 `rules.ts`의 `FONT`와 함께 이 둘도 간다(임시 대체 서체다). */
const FONT_FILE = '/fonts/hd/Isamanru-Medium.woff2'
const FONT_FAMILY = 'Isamanru'
/** 글자를 윤곽선으로 바꿔 주는 곳. em 좌표계의 path만 주고 배치는 이 파일이 한다. */
const OUTLINE_API = '/api/ci-outline'

/** 파일이 사람 눈에 읽히게 소수점을 자른다. 0.01px은 어차피 아무 의미가 없다. */
const n = (v: number) => Math.round(v * 100) / 100

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * 서체를 data URI로 심는다 — 받는 사람 기기에 서체가 없어도 브라우저에서 정본대로 보인다.
 * 🔴 못 심어도 내보내기는 계속한다. 폴백 서체로 보이는 파일이 아무 파일도 없는 것보다 낫다.
 */
async function fontStyle(): Promise<string> {
	try {
		const bytes = new Uint8Array(await (await fetch(FONT_FILE)).arrayBuffer())
		// 🔴 한 번에 펼치면 인자 개수 한계로 스택이 넘친다(서체가 330KB다). 조각내서 잇는다.
		const CHUNK = 0x8000
		let raw = ''
		for (let i = 0; i < bytes.length; i += CHUNK)
			raw += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
		return `<style>@font-face{font-family:"${FONT_FAMILY}";font-weight:${FONT.weight};src:url(data:font/woff2;base64,${btoa(raw)}) format("woff2")}</style>`
	} catch {
		return ''
	}
}

type Outline = { d: string; advance: number }

/**
 * 글자마다 윤곽선을 받아 온다. 🔴 실패하면 `null` — 그때는 `<text>` + 서체 임베드로 내보낸다.
 * 파일이 도구를 덜 타는 쪽이 낫지만, 아무 파일도 안 나가는 것보다는 텍스트로라도 나가는 게 낫다.
 */
async function outlines(
	runs: { text: string }[],
): Promise<{ upm: number; runs: Outline[] } | null> {
	try {
		const response = await fetch(OUTLINE_API, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ runs }),
		})
		if (!response.ok) return null
		const data = (await response.json()) as { upm: number; runs: Outline[] }
		return data.runs?.length === runs.length ? data : null
	} catch {
		return null
	}
}

/** `root` 안의 잉크(심볼·글자·구분바)만 투명 배경의 SVG로 옮긴다. */
export async function lockupSvg(root: HTMLElement): Promise<string> {
	// 화면 맞춤 배율을 걷어내 SVG는 원래 H 기준의 좌표와 글자 크기를 유지한다.
	const fit = root.closest<HTMLElement>('[data-display-fit-content]')
	const scale = fit
		? Number.parseFloat(getComputedStyle(fit).getPropertyValue('--display-scale')) || 1
		: 1
	const rect = (element: Element) => {
		const r = element.getBoundingClientRect()
		return {
			left: r.left / scale,
			top: r.top / scale,
			width: r.width / scale,
			height: r.height / scale,
		}
	}
	const box = rect(root)
	const body: string[] = []

	// 구분바 — 글자가 아니라 면이다(계열사 락업).
	for (const bar of root.querySelectorAll<HTMLElement>('[data-ink="bar"]')) {
		const r = rect(bar)
		body.push(
			`<rect x="${n(r.left - box.left)}" y="${n(r.top - box.top)}" width="${n(r.width)}" height="${n(r.height)}" fill="${getComputedStyle(bar).backgroundColor}"/>`,
		)
	}

	// 심볼 — 화면의 것을 **그대로 복제**한다. 이미 좌표로 그린 SVG라 다시 만들 이유가 없다.
	for (const symbol of root.querySelectorAll<SVGSVGElement>('[data-ink="symbol"]')) {
		const r = rect(symbol)
		const clone = symbol.cloneNode(true) as SVGSVGElement
		clone.removeAttribute('class')
		clone.removeAttribute('aria-hidden')
		clone.removeAttribute('data-ink')
		// 전환용 인라인 스타일은 파일에서 의미가 없다.
		for (const styled of clone.querySelectorAll('[style]')) styled.removeAttribute('style')
		clone.setAttribute('x', String(n(r.left - box.left)))
		clone.setAttribute('y', String(n(r.top - box.top)))
		clone.setAttribute('width', String(n(r.width)))
		clone.setAttribute('height', String(n(r.height)))
		body.push(clone.outerHTML)
	}

	// 글자 — 조각(라틴/한글)마다 한 줄이다. 조판은 브라우저가 한 그대로 옮긴다.
	const runs = [...root.querySelectorAll<HTMLElement>('[data-ink="text"]')]
	const shapes = await outlines(runs.map((run) => ({ text: run.textContent ?? '' })))

	runs.forEach((run, index) => {
		const r = rect(run)
		const style = getComputedStyle(run)
		const size = Number.parseFloat(style.fontSize)
		// 🔑 베이스라인은 재는 것이 아니라 계산이다 — `line-height: 1`이라 줄상자 위에서 정확히
		//    `INK_BASELINE × font-size` 아래다. rect는 줄상자를 주므로 그 차이를 여기서 더한다.
		const x = n(r.left - box.left)
		const y = n(r.top - box.top + INK_BASELINE * size)
		const shape = shapes?.runs[index]
		const upm = shapes?.upm ?? 0
		if (shape?.d && upm) {
			// 🔑 **글자를 도형으로 내보낸다** — 파일이 서체에 의존하지 않게 하려는 것이다(디자인
			//    도구는 SVG의 `@font-face`를 무시한다). 모양은 em 좌표계로 오고 배치는 여기서 한다:
			//    베이스라인으로 옮기고 `size/upm`으로 줄이며 y를 뒤집는다(em은 위로 +, SVG는 아래로 +).
			const s = size / upm
			body.push(
				`<path transform="translate(${x} ${y}) scale(${n(s * 1000) / 1000} ${-n(s * 1000) / 1000})" fill="${style.color}" d="${shape.d}"/>`,
			)
			return
		}
		// 🔴 폴백: 윤곽선을 못 받으면 글자 그대로 내보내고 서체를 파일에 심는다.
		body.push(
			`<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${n(size)}" font-weight="${style.fontWeight}" fill="${style.color}" xml:space="preserve">${esc(run.textContent ?? '')}</text>`,
		)
	})

	const w = n(box.width)
	const h = n(box.height)
	// 서체는 폴백에서만 필요하다 — 도형으로 나갔으면 파일에 심지 않는다(430KB가 사라진다).
	const style = body.some((part) => part.startsWith('<text')) ? await fontStyle() : ''
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${style}${body.join('')}</svg>`
}
