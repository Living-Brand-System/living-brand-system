import type { Field } from 'payload'
import { TOKEN_LIMIT_PERIODS, type TokenLimitPeriod } from '@/modules/ai-usage/token-limit'

const PERIOD_LABELS: Record<TokenLimitPeriod, string> = {
	daily: '일 한도 (한국 시간 0시 기준)',
	monthly: '월 한도',
}

/**
 * 토큰 한도의 일·월 두 묶음 — 전체 기본값(전역 설정)과 계정 설정이 같은 모양을 쓴다.
 * 계정 쪽만 「기본값 따름」을 더 갖는다. 판정은 `modules/ai-usage/token-limit`이 한다.
 */
export function tokenLimitPeriodFields(scope: 'default' | 'account'): Field[] {
	const options = [
		...(scope === 'account' ? [{ label: '기본값 따름', value: 'default' }] : []),
		{ label: '제한 없음', value: 'unlimited' },
		{ label: '한도 지정', value: 'limit' },
	]
	return TOKEN_LIMIT_PERIODS.map(
		(period): Field => ({
			name: period,
			type: 'group',
			label: PERIOD_LABELS[period],
			fields: [
				{
					name: 'mode',
					type: 'select',
					// 필수로 두면 계정 생성 데이터마다 이 묶음을 요구하게 된다 — 비면 기본값으로 읽는다.
					defaultValue: scope === 'account' ? 'default' : 'unlimited',
					options,
				},
				{
					name: 'tokens',
					type: 'number',
					label: '토큰 수',
					min: 1,
					admin: {
						condition: (_, sibling) => sibling?.mode === 'limit',
						description: '이 기간에 쓸 수 있는 합계 토큰 수입니다.',
					},
					validate: (
						value: number | null | undefined,
						{ siblingData }: { siblingData: unknown },
					) =>
						(siblingData as { mode?: string } | undefined)?.mode !== 'limit' ||
						(typeof value === 'number' && value > 0)
							? true
							: '한도 토큰 수를 입력하세요.',
				},
			],
		}),
	)
}
