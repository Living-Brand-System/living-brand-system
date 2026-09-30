import { z } from 'zod'
import { isCmykIccProfile } from '@/features/studio-export/color-profile'
import { parsePrintPpi } from '@/features/studio-export/print-policy'
import {
	exportVectorPrint,
	VectorPrintColorError,
	VectorPrintImageError,
	VectorPrintInputError,
	VectorPrintMixedModeError,
	VectorPrintTextError,
} from '@/features/studio-export/services/export-vector-print.service'
import { isPayloadUser } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'
import type { VectorScene } from '@/modules/studio-artifact/studio-artifact'

export const maxDuration = 30

/** 씬은 이미지가 data URI로 들어와 커진다 — 래스터 인쇄 경로와 같은 상한을 쓴다. */
const MAX_SCENE_BYTES = 20_000_000

const requestSchema = z.object({
	colorProfile: z.string().optional(),
	ppi: z.unknown(),
	scene: z.object({
		width: z.number().positive(),
		height: z.number().positive(),
		// 🔴 없어도 된다 — 판 바닥색은 **선언한 씬만** 갖는다(템플릿은 루트 프레임이 갖는다).
		//    필수로 두면 바닥색 없는 씬이 전부 400이 되어 PDF 내보내기가 통째로 막힌다.
		background: z.string().optional(),
		primitives: z.array(z.unknown()),
	}),
})

/**
 * Vector Scene을 인쇄용 PDF로 바꿔 준다.
 *
 * 🔴 서버에 있는 이유는 pdf-lib을 클라이언트 번들에 넣지 않기 위해서다.
 *    SVG 직렬화 자체는 브라우저에서 끝난다.
 * 🔴 다만 Template의 SVG도 `/api/studio-exports/outline` 왕복은 탄다 — 씬을 만드는 단계가
 *    형식과 무관하게 글자를 윤곽선으로 바꾼다. 「SVG는 서버를 안 탄다」가 아니다.
 */
export async function POST(request: Request) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}
	const { user } = await authenticateRequest()
	if (!isPayloadUser(user)) return Response.json({ message: 'Unauthorized.' }, { status: 401 })

	const body = await request.text()
	if (body.length > MAX_SCENE_BYTES) {
		return Response.json({ message: 'Scene is too large.' }, { status: 413 })
	}
	// 🔴 `JSON.parse`가 try 밖이면 잘린 전송의 SyntaxError가 라우트를 터뜨려 400이 500으로 집계된다.
	//    다른 두 라우트(outline·print)가 쓰는 처방과 같게 맞춘다.
	const parsed = requestSchema.safeParse(
		await Promise.resolve()
			.then(() => JSON.parse(body || 'null') as unknown)
			.catch(() => null),
	)
	if (!parsed.success) return Response.json({ message: 'Invalid request.' }, { status: 400 })

	const { colorProfile, scene } = parsed.data
	if (colorProfile !== undefined && !isCmykIccProfile(colorProfile)) {
		return Response.json({ message: 'Invalid color profile.' }, { status: 400 })
	}
	// 🔴 기본값을 두지 않는다 — 빠뜨리면 페이지가 조용히 72ppi로 나가고, 인쇄물은 되돌릴 수 없다.
	const ppi = parsePrintPpi(parsed.data.ppi)
	if (ppi === undefined) return Response.json({ message: 'Invalid ppi.' }, { status: 400 })

	try {
		const pdf = await exportVectorPrint({
			...(colorProfile ? { colorProfile } : {}),
			ppi,
			scene: scene as VectorScene,
		})
		return new Response(new Uint8Array(pdf), {
			headers: {
				'Cache-Control': 'no-store',
				'Content-Disposition': 'attachment; filename="studio-export.pdf"',
				'Content-Length': String(pdf.byteLength),
				'Content-Type': 'application/pdf',
			},
		})
	} catch (error) {
		if (error instanceof VectorPrintTextError) {
			// 🔑 code를 함께 준다 — 클라이언트가 이 원인만 다른 문구로 올린다.
			return Response.json(
				{ code: 'text-not-outlined', message: 'Text is not outlined.' },
				{ status: 422 },
			)
		}
		if (error instanceof VectorPrintColorError) {
			return Response.json(
				{
					code: 'color-not-convertible',
					message: 'Scene color is not convertible to CMYK.',
				},
				{ status: 422 },
			)
		}
		if (error instanceof VectorPrintImageError) {
			return Response.json(
				{
					code: 'image-not-convertible',
					message: 'Scene image is not convertible to CMYK.',
				},
				{ status: 422 },
			)
		}
		if (error instanceof VectorPrintMixedModeError) {
			// 원인이 코드에 있으므로 서버 로그에 무엇이 남았는지 적는다.
			console.error(`vector-print: CMYK 아닌 색이 남았습니다 — ${error.message}`)
			return Response.json(
				{ code: 'mixed-color-mode', message: 'PDF still contains non-CMYK color.' },
				{ status: 500 },
			)
		}
		if (error instanceof VectorPrintInputError) {
			return Response.json({ message: 'Scene is too complex.' }, { status: 413 })
		}
		throw error
	}
}
