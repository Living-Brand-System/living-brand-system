import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ReviewSidebar } from '@/components/studio/review/review-sidebar'
import { CheckImageProvider } from './use-check-images'

describe('CheckImageProvider', () => {
	afterEach(cleanup)

	it('발행된 검수 시나리오가 없으면 실행을 잠근다', () => {
		render(
			<CheckImageProvider scenarios={[]}>
				<ReviewSidebar sections={[]} />
			</CheckImageProvider>,
		)

		expect(screen.getByRole('button', { name: '검사' })).toBeDisabled()
		expect(screen.getByRole('button', { name: '전부 검사' })).toBeDisabled()
	})

	it('시나리오가 있어도 파일이 없으면 목록 자리가 드롭존이다', () => {
		render(
			<CheckImageProvider scenarios={[{ key: 'quick', title: '빠른 검수', checkKeys: [] }]}>
				<ReviewSidebar sections={[]} />
			</CheckImageProvider>,
		)

		expect(screen.getByText('Drag & Drop')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '전부 검사' })).toBeDisabled()
	})
})
