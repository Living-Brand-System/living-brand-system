import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PageCard } from './page-card'

afterEach(cleanup)

describe('PageCard', () => {
	it('제목 수준은 페이지 구조를 따른다 — 첫 카드는 h1, 나머지는 h2', () => {
		render(
			<>
				<PageCard.Header as="h1" title="내 계정" description="로그인한 계정 정보입니다." />
				<PageCard.Header title="비밀번호" />
			</>,
		)
		expect(screen.getByRole('heading', { level: 1, name: '내 계정' })).toBeInTheDocument()
		expect(screen.getByRole('heading', { level: 2, name: '비밀번호' })).toBeInTheDocument()
		expect(screen.getByText('로그인한 계정 정보입니다.')).toBeInTheDocument()
	})

	it('제목 옆 장식과 오른쪽 동작을 같은 머리에 둔다', () => {
		render(
			<PageCard.Header
				title="계정별 한도"
				adornment={<span>관리자</span>}
				action={<button type="button">모두 저장</button>}
			/>,
		)
		expect(screen.getByText('관리자')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: '모두 저장' })).toBeInTheDocument()
	})
})
