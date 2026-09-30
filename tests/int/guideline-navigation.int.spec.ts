import { describe, expect, it, vi } from 'vitest'
import { getGuidelineNavigation } from '@/features/guideline/services/get-guideline-navigation.service'

vi.mock('@/features/guideline/services/get-guideline-metadata.service', () => ({
	getGuidelineMetadata: vi.fn().mockResolvedValue({
		companyName: 'HD현대',
		documentTitle: 'Guideline',
		faviconHref: null,
		issuedLabel: null,
	}),
}))

vi.mock('@/features/guideline/repositories/guideline-view.payload.repository', () => ({
	listGuidelineChapters: vi
		.fn()
		.mockResolvedValue([{ id: 1, title: 'Basics', slug: 'basics', displayOrder: 0 }]),
	listPublishedGuidelineNavigationTopics: vi.fn().mockResolvedValue([
		{
			chapterId: 1,
			description: null,
			id: 10,
			sections: [
				{ anchor: 'primary-logo', title: 'Primary Logo' },
				{ anchor: 'clear-space', title: 'Clear Space' },
			],
			slug: 'logo',
			title: 'Logo',
		},
		{
			chapterId: 1,
			description: null,
			id: 11,
			sections: [{ anchor: 'the-name', title: 'The Name' }],
			slug: 'the-name',
			title: 'The Name',
		},
	]),
}))

describe('getGuidelineNavigation', () => {
	it('builds chapter, topic, and section navigation', async () => {
		await expect(getGuidelineNavigation()).resolves.toMatchObject({
			chapters: [
				{
					title: 'Basics',
					topics: [
						{
							title: 'Logo',
							href: '/guideline/basics/logo',
							sections: [
								{
									title: 'Primary Logo',
									href: '/guideline/basics/logo#primary-logo',
								},
								{
									title: 'Clear Space',
									href: '/guideline/basics/logo#clear-space',
								},
							],
						},
						{
							title: 'The Name',
							href: '/guideline/basics/the-name',
							sections: [
								{
									title: 'The Name',
									href: '/guideline/basics/the-name#the-name',
								},
							],
						},
					],
				},
			],
		})
	})
})
