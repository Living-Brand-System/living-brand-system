import { getPayload } from 'payload'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_IMAGE_BYTES } from '../image-data-uri'
import {
	listGeneratedImageHistory,
	resolveGeneratedImageReference,
	storeGeneratedImages,
} from './generated-image.payload.repository'

const ONE_PIXEL_PNG =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

describe('GeneratedImage repository', () => {
	const create = vi.fn()
	const fetchImage = vi.fn()
	const find = vi.fn()
	const remove = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal('fetch', fetchImage)
		vi.mocked(getPayload).mockResolvedValue({
			create,
			delete: remove,
			find,
		} as never)
	})

	afterEach(() => vi.unstubAllGlobals())

	it('published 생성 이미지 ID와 프로파일을 확인해 저장 원본을 읽는다', async () => {
		const data = Buffer.from(ONE_PIXEL_PNG.split(',')[1] ?? '', 'base64')
		find.mockResolvedValue({
			docs: [
				{
					effectivePrompt: '{"subject":"파란 세럼병"}',
					filesize: data.byteLength,
					inputPrompt: '파란 세럼병',
					url: '/api/generated-images/file/generated.png',
				},
			],
		})
		fetchImage.mockResolvedValue(
			new Response(data, { headers: { 'Content-Type': 'image/png' } }),
		)
		const user = { id: 1 }

		await expect(
			resolveGeneratedImageReference({
				generatedImageId: 8,
				profileId: 5,
				requestUrl: 'http://localhost/api/generate-image',
				user,
			}),
		).resolves.toEqual({
			data,
			generatedImageId: 8,
			prompt: { effective: '{"subject":"파란 세럼병"}', input: '파란 세럼병' },
		})
		expect(find).toHaveBeenCalledWith({
			collection: 'generated-images',
			depth: 0,
			draft: false,
			limit: 1,
			overrideAccess: true,
			select: {
				effectivePrompt: true,
				filename: true,
				filesize: true,
				inputPrompt: true,
				url: true,
			},
			where: {
				and: [
					{ id: { equals: 8 } },
					{ scenario: { equals: 5 } },
					{ createdBy: { equals: 1 } },
					{ _status: { equals: 'published' } },
				],
			},
		})
		expect(String(fetchImage.mock.calls[0]?.[0])).toBe(
			'http://localhost/api/generated-images/file/generated.png',
		)
	})

	it('조회할 수 없거나 크기 상한을 넘은 생성 이미지는 다운로드하지 않는다', async () => {
		find.mockResolvedValueOnce({ docs: [] }).mockResolvedValueOnce({
			docs: [
				{
					effectivePrompt: '{"subject":"파란 세럼병"}',
					filesize: MAX_IMAGE_BYTES + 1,
					inputPrompt: '파란 세럼병',
					url: '/api/generated-images/file/generated.png',
				},
			],
		})
		const input = {
			generatedImageId: 8,
			profileId: 5,
			requestUrl: 'http://localhost/api/generate-image',
			user: { id: 1 },
		}

		await expect(resolveGeneratedImageReference(input)).resolves.toBeNull()
		await expect(resolveGeneratedImageReference(input)).resolves.toBeNull()
		expect(fetchImage).not.toHaveBeenCalled()
	})

	it('생성 파일과 실행 메타데이터를 published 문서로 저장한다', async () => {
		create.mockResolvedValue({
			createdAt: '2026-07-31T03:00:00.000Z',
			id: 8,
			url: '/api/generated-images/file/generated.png',
		})

		await expect(
			storeGeneratedImages({
				createdBy: 1,
				effectivePrompt: '{"subject":"파란 세럼병"}',
				images: [ONE_PIXEL_PNG],
				inputPrompt: '파란 세럼병',
				model: 'gpt-image-2',
				profile: {
					aspectRatio: '3:2',
					id: 5,
					imageSize: '2K',
					name: '제품 이미지',
				},
			}),
		).resolves.toEqual([
			{
				collection: 'generated-images',
				createdAt: '2026-07-31T03:00:00.000Z',
				id: 8,
				url: '/api/generated-images/file/generated.png',
			},
		])
		expect(create).toHaveBeenCalledWith({
			collection: 'generated-images',
			data: {
				_status: 'published',
				aspectRatio: '3:2',
				// 요청마다 새로 만드는 키라 값 자체는 못박지 않는다 — 한 호출이 같은 키를
				// 나눠 갖는지는 아래 테스트가 본다.
				batchKey: expect.any(String),
				createdBy: 1,
				effectivePrompt: '{"subject":"파란 세럼병"}',
				imageSize: '2K',
				inputPrompt: '파란 세럼병',
				model: 'gpt-image-2',
				scenario: 5,
				scenarioName: '제품 이미지',
			},
			draft: false,
			file: {
				data: expect.any(Buffer),
				mimetype: 'image/png',
				name: expect.stringMatching(/^generated-[\w-]+\.png$/),
				size: expect.any(Number),
			},
			overrideAccess: true,
		})
	})

	it('저장 중 실패하면 이번 요청에서 만든 문서를 정리한다', async () => {
		create
			.mockResolvedValueOnce({
				createdAt: '2026-07-31T03:00:00.000Z',
				id: 8,
				url: '/api/generated-images/file/generated.png',
			})
			.mockRejectedValueOnce(new Error('storage failed'))

		await expect(
			storeGeneratedImages({
				createdBy: 1,
				effectivePrompt: 'effective',
				images: [ONE_PIXEL_PNG, ONE_PIXEL_PNG],
				inputPrompt: 'input',
				model: 'gpt-image-2',
				profile: {
					aspectRatio: '1:1',
					id: 5,
					imageSize: '1K',
					name: '제품 이미지',
				},
			}),
		).rejects.toThrow('storage failed')
		expect(remove).toHaveBeenCalledWith({
			collection: 'generated-images',
			id: 8,
			overrideAccess: true,
		})
	})

	it('MIME과 실제 이미지 형식이 다른 생성 결과를 저장하지 않는다', async () => {
		await expect(
			storeGeneratedImages({
				createdBy: 1,
				effectivePrompt: 'effective',
				images: ['data:image/png;base64,aGVsbG8='],
				inputPrompt: 'input',
				model: 'gpt-image-2',
				profile: {
					aspectRatio: '1:1',
					id: 5,
					imageSize: '1K',
					name: '제품 이미지',
				},
			}),
		).rejects.toThrow()
		expect(create).not.toHaveBeenCalled()
	})
	// 🔑 한 번의 생성 요청이 곧 한 묶음이다 — 장마다 키가 다르면 갤러리에서 겹침이 안 생긴다.
	it('한 호출로 만든 장들은 같은 batchKey를 나눠 갖는다', async () => {
		create.mockResolvedValue({
			createdAt: '2026-07-31T03:00:00.000Z',
			id: 8,
			url: '/api/generated-images/file/generated.png',
		})

		await storeGeneratedImages({
			createdBy: 1,
			effectivePrompt: '{"subject":"파란 세럼병"}',
			images: [ONE_PIXEL_PNG, ONE_PIXEL_PNG, ONE_PIXEL_PNG],
			inputPrompt: '파란 세럼병',
			model: 'gpt-image-2',
			profile: { aspectRatio: '3:2', id: 5, imageSize: '2K', name: '제품 이미지' },
		})

		const keys = create.mock.calls.map(([args]) => args.data.batchKey)
		expect(keys).toHaveLength(3)
		expect(new Set(keys).size).toBe(1)
		expect(keys[0]).toEqual(expect.any(String))
	})

	describe('생성 이미지 목록', () => {
		// isPayloadUser는 role·email로 판정한다.
		const user = { email: 'a@b.c', id: 1, role: 'admin' }

		function row(overrides: Record<string, unknown> = {}) {
			return {
				aspectRatio: '16:9',
				batchKey: 'batch-1',
				createdAt: '2026-09-20T00:00:00.000Z',
				filename: 'generated-1.jpg',
				id: 7,
				imageSize: '2K',
				inputPrompt: '파란 세럼병',
				scenario: 6,
				scenarioName: 'Technical Illustration',
				url: '/api/generated-images/file/generated-1.jpg',
				...overrides,
			}
		}

		// 🔴 2026-09-21에 실제로 겪은 결함이다. Payload는 url을 filename에서 파생하므로 select에
		//    url만 적으면 파생이 꺼져 url이 null로 오고, 매핑이 519행을 전부 조용히 버렸다.
		//    화면에는 「아직 만들어진 이미지가 없습니다」만 떠서 조회가 성공한 것처럼 보였다.
		it('url을 파생시키려면 filename까지 select한다', async () => {
			find.mockResolvedValue({ docs: [], hasNextPage: false })

			await listGeneratedImageHistory({ limit: 10, page: 1, user })

			const select = find.mock.calls[0]?.[0]?.select
			expect(select).toMatchObject({ filename: true, url: true })
		})

		it('사용자 권한을 태워 published만 최신순으로 읽는다', async () => {
			find.mockResolvedValue({ docs: [], hasNextPage: false })

			await listGeneratedImageHistory({ limit: 10, page: 2, user })

			expect(find).toHaveBeenCalledWith(
				expect.objectContaining({
					collection: 'generated-images',
					limit: 10,
					overrideAccess: false,
					page: 2,
					sort: '-createdAt',
					where: { _status: { equals: 'published' } },
				}),
			)
		})

		// 권한이 없는 사용자에게는 Payload가 메타 필드를 빼고 내려준다 — 그림은 남아야 한다.
		it('메타가 빠진 행도 그림은 남기고 복원 값만 비운다', async () => {
			find.mockResolvedValue({
				docs: [
					row({ aspectRatio: undefined, inputPrompt: undefined, scenario: undefined }),
				],
				hasNextPage: false,
			})

			const { items } = await listGeneratedImageHistory({ limit: 10, page: 1, user })

			expect(items).toHaveLength(1)
			expect(items[0]).toMatchObject({ aspectRatio: null, profileId: null, prompt: null })
			expect(items[0]?.url).toBe('/api/generated-images/file/generated-1.jpg')
		})

		it('url이 없는 행은 그릴 수 없으므로 뺀다', async () => {
			find.mockResolvedValue({ docs: [row({ url: null })], hasNextPage: true })

			const { hasMore, items } = await listGeneratedImageHistory({ limit: 10, page: 1, user })

			expect(items).toHaveLength(0)
			expect(hasMore).toBe(true)
		})
	})
})
