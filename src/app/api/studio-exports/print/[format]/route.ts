import { z } from 'zod'
import { isCmykIccProfile } from '@/features/studio-export/color-profile'
import {
	MAX_PRINT_PNG_BYTES,
	type PrintExportFormat,
	parsePrintPpi,
} from '@/features/studio-export/print-policy'
import {
	exportPrint,
	PrintExportInputError,
} from '@/features/studio-export/services/export-print.service'
import { isPayloadUser } from '@/lib/auth'
import { authenticateRequest, isCrossOriginRequest } from '@/lib/request-auth'

export const maxDuration = 30

const routeParamsSchema = z.object({ format: z.enum(['pdf', 'tiff']) })
const RATE_WINDOW_MS = 60_000
const MAX_EXPORTS_PER_WINDOW = 30
const MAX_EXPORTS_PER_CLIENT = 6
const MAX_RATE_CLIENTS = 1_000
const OUTPUT_CHUNK_BYTES = 64 * 1024

const formats = {
	pdf: { contentType: 'application/pdf', extension: 'pdf' },
	tiff: { contentType: 'image/tiff', extension: 'tiff' },
} satisfies Record<PrintExportFormat, { contentType: string; extension: string }>

let activeExports = 0
let globalWindow = { count: 0, resetAt: 0 }
const clientWindows = new Map<string, { count: number; resetAt: number }>()

// ponytail: process-local 제한이다. 서버 인스턴스가 둘 이상이면 공유 edge/Redis limiter로 교체한다.
function takeRateLimit(request: Request, now = Date.now()): boolean {
	if (now >= globalWindow.resetAt) globalWindow = { count: 0, resetAt: now + RATE_WINDOW_MS }
	if (globalWindow.count >= MAX_EXPORTS_PER_WINDOW) return false
	const key =
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip')?.trim() ||
		'anonymous'
	const current = clientWindows.get(key)
	const window =
		!current || now >= current.resetAt ? { count: 0, resetAt: now + RATE_WINDOW_MS } : current
	if (window.count >= MAX_EXPORTS_PER_CLIENT) return false
	if (!clientWindows.has(key) && clientWindows.size >= MAX_RATE_CLIENTS) {
		const oldestKey = clientWindows.keys().next().value
		if (oldestKey) clientWindows.delete(oldestKey)
	}
	window.count += 1
	clientWindows.set(key, window)
	globalWindow.count += 1
	return true
}

function streamOutput(buffer: Buffer, onDone: () => void): ReadableStream<Uint8Array> {
	let offset = 0
	let finished = false
	const finish = () => {
		if (finished) return
		finished = true
		onDone()
	}
	return new ReadableStream({
		cancel: finish,
		pull(controller) {
			const end = Math.min(offset + OUTPUT_CHUNK_BYTES, buffer.byteLength)
			controller.enqueue(
				new Uint8Array(buffer.buffer, buffer.byteOffset + offset, end - offset),
			)
			offset = end
			if (offset >= buffer.byteLength) {
				controller.close()
				finish()
			}
		},
	})
}

/** 인증된 Studio Raster Artifact를 공통 CMYK 인쇄 파일로 변환하는 HTTP adapter. */
export async function POST(request: Request, { params }: { params: Promise<{ format: string }> }) {
	if (isCrossOriginRequest(request)) {
		return Response.json({ message: 'Invalid origin.' }, { status: 403 })
	}
	const { user } = await authenticateRequest()
	if (!isPayloadUser(user)) return Response.json({ message: 'Unauthorized.' }, { status: 401 })

	const routeParams = routeParamsSchema.safeParse(await params)
	if (!routeParams.success) {
		return Response.json({ message: 'Invalid route parameters.' }, { status: 400 })
	}
	// 🔴 순서가 중요하다 — rate limit을 먼저 보면 동시성 때문에 거부된 요청도 사용자 분당 예산을
	//    이미 깎아, 붐빌 때 재시도하면 1분간 429가 고착된다. 동시성 검사를 앞에 둔다.
	if (activeExports >= 1 || !takeRateLimit(request)) {
		return Response.json(
			{ message: 'Print export is busy.' },
			{ headers: { 'Retry-After': '60' }, status: 429 },
		)
	}
	activeExports += 1
	let streamOwnsSlot = false

	try {
		const form = await request.formData().catch(() => null)
		const colorProfile = form?.get('colorProfile')
		const ppi = parsePrintPpi(form?.get('ppi'))
		const image = form?.get('image')
		if (!isCmykIccProfile(colorProfile) || !ppi || !(image instanceof File)) {
			return Response.json({ message: 'Invalid request.' }, { status: 400 })
		}
		if (image.size > MAX_PRINT_PNG_BYTES) {
			return Response.json({ message: 'Image is too large.' }, { status: 413 })
		}
		const result = await exportPrint({
			colorProfile,
			format: routeParams.data.format,
			png: Buffer.from(await image.arrayBuffer()),
			ppi,
		})
		const output = formats[routeParams.data.format]
		const response = new Response(
			streamOutput(result, () => (activeExports -= 1)),
			{
				headers: {
					'Cache-Control': 'no-store',
					'Content-Length': String(result.byteLength),
					'Content-Disposition': `attachment; filename="studio-export.${output.extension}"`,
					'Content-Type': output.contentType,
				},
			},
		)
		streamOwnsSlot = true
		return response
	} catch (error) {
		if (error instanceof PrintExportInputError) {
			return Response.json({ message: 'Invalid PNG.' }, { status: 400 })
		}
		return Response.json({ message: 'Print export failed.' }, { status: 500 })
	} finally {
		if (!streamOwnsSlot) activeExports -= 1
	}
}
