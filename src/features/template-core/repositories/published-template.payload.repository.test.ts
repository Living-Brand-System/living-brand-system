import { getPayload } from 'payload'
import { describe, expect, it, vi } from 'vitest'
import {
	listPublishedTemplateNavItems,
	listTemplateCategories,
} from './published-template.payload.repository'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

function mockFind(docs: unknown[]) {
	const find = vi.fn().mockResolvedValue({ docs })
	vi.mocked(getPayload).mockResolvedValue({ find } as never)
	return find
}

const navDoc = {
	id: 10,
	name: 'Poster',
	slug: 'poster',
	html: '<p data-node-id="title">제목</p>',
	overrides: {},
	width: 630,
	height: 891,
}

describe('listPublishedTemplateNavItems', () => {
	// 🔴 이 저장소의 계약은 "관계 유니온을 밖으로 내보내지 않는다"다. depth가 바뀌면 Payload가
	// category를 id로도, 문서로도 준다 — 둘 다 같은 categoryId로 나와야 한다.
	it('category가 id로 와도 문서로 와도 같은 categoryId로 좁힌다', async () => {
		mockFind([{ ...navDoc, category: 3 }])
		expect((await listPublishedTemplateNavItems())[0]?.categoryId).toBe(3)

		mockFind([{ ...navDoc, category: { id: 3, title: 'Editorial', slug: 'editorial' } }])
		expect((await listPublishedTemplateNavItems())[0]?.categoryId).toBe(3)
	})

	it('미리보기 이미지를 표시 계약으로 좁히고, populate되지 않은 id는 버린다', async () => {
		mockFind([
			{
				...navDoc,
				category: 3,
				previewImage: {
					url: '/media/poster.png',
					alt: '포스터 미리보기',
					sizes: { thumbnail: { url: '/media/poster-320x240.png' } },
				},
			},
		])
		expect((await listPublishedTemplateNavItems())[0]?.previewImage).toEqual({
			url: '/media/poster.png',
			alt: '포스터 미리보기',
		})

		mockFind([{ ...navDoc, category: 3, previewImage: 282 }])
		expect((await listPublishedTemplateNavItems())[0]?.previewImage).toBeUndefined()
	})

	it('렌더 판정에 필요한 원본 필드를 null 자리까지 그대로 지난다', async () => {
		mockFind([{ id: 11, name: '초안', slug: 'draft', category: 3 }])

		expect((await listPublishedTemplateNavItems())[0]).toMatchObject({
			html: null,
			width: null,
			height: null,
		})
	})
})

describe('listTemplateCategories', () => {
	it('id·title·slug만 지나는 read model로 좁힌다', async () => {
		mockFind([
			{ id: 3, title: 'Editorial', slug: 'editorial', displayOrder: 0, createdAt: 'x' },
		])

		expect(await listTemplateCategories()).toEqual([
			{ id: 3, title: 'Editorial', slug: 'editorial' },
		])
	})
})
