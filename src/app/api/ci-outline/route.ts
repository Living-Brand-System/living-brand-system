import { readFile } from 'node:fs/promises'
import path from 'node:path'
import * as fontkit from 'fontkit'
import { z } from 'zod'
import { isCrossOriginRequest } from '@/lib/request-auth'

/*
 * 글자를 **윤곽선**으로 바꿔 준다. CI를 SVG로 내보낼 때 파일이 서체에 의존하지 않게 하려는 것이다 —
 * 디자인 도구(Figma·Illustrator)는 SVG 안의 `@font-face`를 무시하므로, 서체를 파일에 심어도
 * 그쪽에서는 폴백 서체로 보인다. 로고 자산의 정석대로 도형으로 내보낸다.
 *
 * 🔑 **배치는 하지 않는다.** 좌표는 화면(브라우저 레이아웃)이 정하고 여기는 모양만 준다 — 이 리포는
 *    글자 폭을 계산하지 않는다는 결정을 유지한다(`rules.ts` FONT 주석). 그래서 응답은 **em 좌표계의
 *    path**이고, 어디에 얼마로 놓을지는 호출부가 자기 실측으로 정한다.
 * 🔑 그래도 검산은 된다: `advance × (size / upm)`이 화면에서 잰 그 줄의 폭과 같아야 한다.
 *    실측으로 정확히 일치했다(`HD` 1576 · `현대` 1840 = 130px/82.49 · 135.6px/73.7).
 * 🔴 서버에서만 돈다 — fontkit을 클라이언트 번들에 넣지 않으려는 것이고, woff2 해제도 여기서 끝난다.
 */

/** 🔴 서체 파일의 정본 위치는 `ci-lockup/rules.ts`의 `FONT`가 갖는다. 서체가 바뀌면 함께 간다. */
const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'hd', 'Isamanru-Medium.woff2')

/**
 * 🔴 인증 없는 공개 경로다(가이드라인 페이지가 공개) — 그래서 상한이 유일한 방어선이다.
 *    수치는 같은 일을 하는 `studio-exports/outline`과 맞춘다. 락업은 몇 줄뿐이라 여유가 크다.
 */
const requestSchema = z.object({
	runs: z
		.array(z.object({ text: z.string().max(2_000) }))
		.min(1)
		.max(500),
})

/** 파싱은 한 번만 — 요청마다 12,260자 폰트를 다시 열지 않는다. */
let cached: Promise<fontkit.Font> | null = null
function font() {
	cached ??= readFile(FONT_PATH).then((buffer) => {
		const parsed = fontkit.create(buffer)
		// 컬렉션(ttc)이면 첫 서체를 쓴다 — 우리 파일은 단일이지만 타입이 둘을 함께 말한다.
		return 'fonts' in parsed ? parsed.fonts[0] : parsed
	})
	return cached
}

export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}

	const body = requestSchema.safeParse(await request.json().catch(() => null))
	if (!body.success) {
		return Response.json({ message: 'runs[].text is required.' }, { status: 400 })
	}
	const { runs } = body.data

	const parsed = await font()
	return Response.json({
		upm: parsed.unitsPerEm,
		runs: runs.map(({ text }) => {
			const laid = parsed.layout(text)
			let advance = 0
			const parts: string[] = []
			laid.glyphs.forEach((glyph, index) => {
				const position = laid.positions[index]
				// 🔴 글자마다 자기 자리로 옮겨 하나의 path로 합친다. y는 뒤집지 않는다 —
				//    em 좌표계(위로 +)를 그대로 주고, 뒤집는 것은 호출부의 transform이다.
				const placed = glyph.path.translate(
					advance + (position.xOffset ?? 0),
					position.yOffset ?? 0,
				)
				const d = placed.toSVG()
				if (d) parts.push(d)
				advance += position.xAdvance
			})
			return { d: parts.join(' '), advance }
		}),
	})
}
