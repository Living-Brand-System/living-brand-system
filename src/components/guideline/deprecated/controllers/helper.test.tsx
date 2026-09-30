import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { GuidelineHelperProvider } from '@/features/guideline/providers/guideline-helper-provider'
import { GuidelineHelperRegion, GuidelineHelperSlot } from './helper'

afterEach(() => {
	cleanup()
	vi.unstubAllGlobals()
})

it('나란히 놓인 카드의 컨트롤을 포커스와 클릭으로 선택한다', () => {
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			observe() {}
			unobserve() {}
			disconnect() {}
		},
	)
	render(
		<GuidelineHelperProvider>
			<GuidelineHelperRegion label="국문" controls={<button type="button">국문 편집</button>}>
				국문 표본
			</GuidelineHelperRegion>
			<GuidelineHelperRegion label="영문" controls={<button type="button">영문 편집</button>}>
				영문 표본
			</GuidelineHelperRegion>
			<GuidelineHelperSlot />
		</GuidelineHelperProvider>,
	)
	fireEvent.focus(screen.getByRole('group', { name: '국문 조절' }))
	expect(screen.getByRole('button', { name: '국문 편집' })).toBeInTheDocument()
	fireEvent.pointerDown(screen.getByRole('group', { name: '영문 조절' }))
	expect(screen.queryByRole('button', { name: '국문 편집' })).toBeNull()
	expect(screen.getByRole('button', { name: '영문 편집' })).toBeInTheDocument()
})
