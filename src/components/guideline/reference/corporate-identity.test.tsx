import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GUIDELINE_DOCUMENT_SURFACE } from '@/features/guideline/cards/displays/dynamics/surface'
import { CorporateIdentityReference } from './corporate-identity'

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})
it('목표 페이지가 새 구조와 보호공간 토글을 사용한다', () => {
	vi.stubGlobal(
		'ResizeObserver',
		class {
			observe() {}
			disconnect() {}
		},
	)
	const { container } = render(<CorporateIdentityReference />)
	expect(screen.getByRole('heading', { level: 1, name: 'Corporate Identity' })).toBeTruthy()
	expect(screen.getByRole('heading', { level: 3, name: 'Safe Area' })).toBeTruthy()
	expect(container.querySelector('[data-slot="reference-card"]')).toBeNull()
	expect(container.querySelector('[data-slot="clearspace-overlay"]')).toBeNull()
	fireEvent.click(screen.getByRole('radio', { name: 'On' }))
	expect(
		container.querySelector('[data-slot="clearspace-overlay"]')?.getAttribute('src'),
	).toContain('hd-horizontal-default-clearSpace.svg')
	expect(screen.getByRole('button', { name: 'Brand Signature 에셋 전체 다운로드' })).toBeTruthy()
	expect(screen.getByRole('button', { name: 'Safe Area 에셋 전체 다운로드' })).toBeTruthy()
	expect(container.querySelector('main')).toHaveClass(...GUIDELINE_DOCUMENT_SURFACE.split(' '))
	expect(screen.queryByText('Figma 원본의 도판이 비어 있습니다.')).toBeNull()
	expect(
		screen
			.getAllByText(/디지털 응용매체에서 즐겨찾기 아이콘/)
			.filter((node) => !node.closest('[aria-hidden="true"]')),
	).toHaveLength(1)
	expect(screen.getByRole('link', { name: 'HD 로고 기본형 다운로드' })).toHaveAttribute(
		'download',
		'hd-horizontal-default.svg',
	)
})
