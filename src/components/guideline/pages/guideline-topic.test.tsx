import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GuidelineTopic } from './guideline-topic'

vi.mock('@/components/guideline/refresh-route-on-save', () => ({
	RefreshRouteOnSave: () => <span data-testid="preview-refresh" />,
}))

afterEach(cleanup)

it('신규 제목·섹션·도판·푸터 순서와 CMS 앵커를 유지한다', () => {
	const { container } = render(
		<GuidelineTopic
			topic={{
				title: 'Typography',
				headerImage: null,
				sections: [
					{
						id: 's1',
						type: 'section',
						title: '언어별 표본',
						anchor: 'language',
						download: { source: 'none' },
						containers: [
							{
								type: 'grid',
								columns: '3',
								cards: [
									{
										ratio: '4:3',
										download: { source: 'none' },
										caption: { type: 'basic' },
										display: {
											type: 'image',
											image: {
												relationTo: 'application-images',
												value: {
													id: 1,
													filename: 'sample.png',
													url: '/sample.png',
													alt: '표본',
												} as never,
											},
										},
									},
								],
							},
						],
					},
				],
			}}
		/>,
	)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Typography')
	expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('언어별 표본')
	expect(screen.getByRole('img', { name: '표본' }).getAttribute('src')).toContain('%2Fsample.png')
	const section = container.querySelector('#language')
	const footer = container.querySelector('[data-slot="guideline-display-footer"]')
	if (!section || !footer) throw new Error('섹션 또는 푸터 누락')
	expect(section.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	expect(footer.querySelector('img')).toHaveAttribute('alt', 'HD현대')
	expect(container.querySelector('.pointer-events-none.absolute.inset-0')).toBeNull()
	expect(screen.queryByTestId('preview-refresh')).not.toBeInTheDocument()
})

it('빈 신규 본문도 Helper 없이 푸터와 프리뷰 갱신을 유지한다', () => {
	const topic = { title: 'Empty', headerImage: null, sections: [] }
	const { container, rerender } = render(<GuidelineTopic topic={topic} previewDocumentId={1} />)
	expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Empty')
	expect(container.querySelector('section')).toBeNull()
	expect(container.querySelector('[data-slot="guideline-display-footer"]')).not.toBeNull()
	expect(container.querySelector('.pointer-events-none.absolute.inset-0')).toBeNull()
	expect(screen.getByTestId('preview-refresh')).toBeInTheDocument()
	rerender(<GuidelineTopic topic={topic} />)
	expect(screen.queryByTestId('preview-refresh')).not.toBeInTheDocument()
})
