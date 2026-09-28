import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { downloadSectionAssets } from '@/features/guideline/services/download-section-assets.client'
import { GuidelineDisplayHeading, GuidelineSection, GuidelineSectionHeading } from './components'

vi.mock('@/features/guideline/services/download-section-assets.client', () => ({
	downloadSectionAssets: vi.fn(),
}))
const download = { filename: 'section.zip', assets: [{ url: '/logo.svg', filename: 'logo.svg' }] }
describe('가이드라인 문서 구조', () => {
	it('h1/h2/h3와 섹션 이름을 연결하고 없는 설명·다운로드를 생략한다', () => {
		const { container } = render(
			<>
				<GuidelineDisplayHeading title="문서" />
				<GuidelineSection id="main" hierarchy="main">
					<GuidelineSectionHeading id="main-heading" hierarchy="main" title="섹션" />
				</GuidelineSection>
				<GuidelineSection id="sub" hierarchy="sub">
					<GuidelineSectionHeading
						id="sub-heading"
						hierarchy="sub"
						title="하위"
						download={{ filename: 'empty', assets: [] }}
					/>
				</GuidelineSection>
			</>,
		)
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('문서')
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('섹션')
		expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('하위')
		expect(screen.getByRole('region', { name: '섹션' })).not.toContainElement(
			screen.getByRole('region', { name: '하위' }),
		)
		expect(container.querySelectorAll('p')).toHaveLength(0)
		expect(screen.queryByRole('button')).toBeNull()
	})
	it('다운로드 중복 실행을 막고 실패 후 재시도한다', async () => {
		let reject!: (error: Error) => void
		vi.mocked(downloadSectionAssets)
			.mockImplementationOnce(
				() =>
					new Promise((_, fail) => {
						reject = fail
					}),
			)
			.mockResolvedValueOnce(undefined)
		render(
			<GuidelineSectionHeading
				id="download-heading"
				hierarchy="main"
				title="파일"
				download={download}
			/>,
		)
		const button = screen.getByRole('button', { name: '파일 에셋 전체 다운로드' })
		fireEvent.click(button)
		fireEvent.click(button)
		expect(downloadSectionAssets).toHaveBeenCalledTimes(1)
		expect(button).toBeDisabled()
		reject(new Error('network'))
		await screen.findByRole('alert')
		fireEvent.click(button)
		await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
		expect(downloadSectionAssets).toHaveBeenLastCalledWith(download)
	})
})
