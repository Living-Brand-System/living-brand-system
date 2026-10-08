import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	authenticateRequest: vi.fn(),
	exportPrint: vi.fn(),
	isCrossOriginRequest: vi.fn(),
}))

vi.mock('@/lib/request-auth', () => ({
	authenticateRequest: mocks.authenticateRequest,
	isCrossOriginRequest: mocks.isCrossOriginRequest,
}))
vi.mock('@/features/studio-export/services/export-print.service', () => {
	class PrintExportInputError extends Error {}
	return { exportPrint: mocks.exportPrint, PrintExportInputError }
})

function exportRequest() {
	const image = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'artifact.png', {
		type: 'image/png',
	})
	Object.defineProperty(image, 'arrayBuffer', {
		value: async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47]).buffer,
	})
	const values = new Map<string, FormDataEntryValue>([
		['colorProfile', 'cgats21-crpc6'],
		['image', image],
		['ppi', '300'],
	])
	return {
		headers: new Headers({ 'x-forwarded-for': crypto.randomUUID() }),
		formData: async () => ({ get: (key: string) => values.get(key) ?? null }),
	} as Request
}

async function loadPost() {
	vi.resetModules()
	return (await import('./route')).POST
}

describe('POST /api/studio-exports/print/[format]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.authenticateRequest.mockResolvedValue({ user: { collection: 'users' } })
		mocks.isCrossOriginRequest.mockReturnValue(false)
		mocks.exportPrint.mockResolvedValue(Buffer.from('print'))
	})

	it.each([
		['pdf', 'application/pdf'],
		['tiff', 'image/tiff'],
	])('%s를 Studio 구분 없이 변환한다', async (format, contentType) => {
		const POST = await loadPost()
		const response = await POST(exportRequest(), { params: Promise.resolve({ format }) })
		expect(response.status).toBe(200)
		expect(response.headers.get('Content-Type')).toBe(contentType)
		expect(await response.text()).toBe('print')
		expect(mocks.exportPrint).toHaveBeenCalledWith({
			colorProfile: 'cgats21-crpc6',
			format,
			png: expect.any(Buffer),
			ppi: 300,
		})
	})

	it('인증되지 않은 요청은 변환 전에 거부한다', async () => {
		mocks.authenticateRequest.mockResolvedValue({ user: null })
		const POST = await loadPost()
		const response = await POST(exportRequest(), { params: Promise.resolve({ format: 'pdf' }) })
		expect(response.status).toBe(401)
		expect(mocks.exportPrint).not.toHaveBeenCalled()
	})
})
