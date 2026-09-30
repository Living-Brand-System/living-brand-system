import { expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
	getPayload: async () => ({
		find: async () => ({
			docs: [
				{
					id: 1,
					name: 'Secondary Color',
					colors: [
						'HD LIGHT GREEN',
						'HD DEEP GREEN',
						'HD LIGHT BLUE',
						'HD DEEP BLUE',
					].map((name, id) => ({ id, name, hex: '#123456', _status: 'published' })),
				},
			],
		}),
	}),
}))

import { findPaletteCatalog } from './palette.payload.repository'

it('보조색을 피그마 순서로 반환하며 입력 색상값을 유지한다', async () => {
	const catalog = await findPaletteCatalog()
	expect(catalog.supportive?.colors.map((color) => color.label)).toEqual([
		'HD LIGHT GREEN',
		'HD LIGHT BLUE',
		'HD DEEP GREEN',
		'HD DEEP BLUE',
	])
	expect(catalog.supportive?.colors.every((color) => color.value === '#123456')).toBe(true)
})

it('MCP·Agent 팔레트 조회는 전달된 사용자·로케일의 접근 제어를 유지한다', async () => {
	const find = vi.fn().mockResolvedValue({ docs: [] })
	const user = { id: 42 }
	const req = { user }
	await findPaletteCatalog({ payload: { find }, user, req, locale: 'en' } as never)
	expect(find).toHaveBeenCalledWith(
		expect.objectContaining({
			overrideAccess: false,
			user,
			req,
			locale: 'en',
			fallbackLocale: 'en',
			draft: false,
		}),
	)
})
