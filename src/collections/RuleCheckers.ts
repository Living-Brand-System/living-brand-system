import type { CollectionConfig, SelectFieldValidation, TextFieldValidation } from 'payload'
import { RULE_EXECUTOR_OPTIONS, type RuleExecutor } from '@/features/quality-rule/rule-executor'
import { managerManagedAccess } from '@/lib/auth'
import { draftVersions } from './shared'

const requiredFor =
	(executor: RuleExecutor, message: string): TextFieldValidation =>
	(value, { siblingData }) => {
		const selectedExecutor = (siblingData as { executor?: RuleExecutor })?.executor
		return (
			selectedExecutor !== executor ||
			(typeof value === 'string' && value.trim().length > 0) ||
			message
		)
	}

const requiredSelectFor =
	(executor: RuleExecutor, message: string): SelectFieldValidation =>
	(value, { siblingData }) => {
		const selectedExecutor = (siblingData as { executor?: RuleExecutor })?.executor
		return (
			selectedExecutor !== executor ||
			(typeof value === 'string' && value.length > 0) ||
			message
		)
	}

const aiExecutorCondition = (_data: unknown, siblingData: { executor?: RuleExecutor }) =>
	siblingData?.executor === 'heuristic' || siblingData?.executor === 'manual'

export const RuleCheckers: CollectionConfig = {
	slug: 'rule-checkers',
	dbName: 'rule_checkers',
	access: managerManagedAccess,
	labels: {
		singular: '검수 도구 및 설정',
		plural: '검수 도구 및 설정',
	},
	admin: {
		group: '검수 설정',
		useAsTitle: 'name',
		defaultColumns: ['name', 'key', 'executor', '_status', 'updatedAt'],
		description: 'Rule을 실행할 도구와 호출 계약입니다.',
		listSearchableFields: ['name', 'key', 'checkerKey', 'model'],
	},
	versions: draftVersions,
	fields: [
		{
			name: 'name',
			type: 'text',
			required: true,
			admin: {
				description: '목록과 Check의 checker 선택에 표시할 이름입니다.',
			},
		},
		{
			name: 'key',
			type: 'text',
			required: true,
			unique: true,
			index: true,
			admin: {
				description: '검사 도구의 안정적인 식별자입니다.',
			},
		},
		{
			name: 'executor',
			type: 'select',
			required: true,
			options: [...RULE_EXECUTOR_OPTIONS],
		},
		{
			name: 'checkerKey',
			type: 'text',
			validate: requiredFor('deterministic', 'Checker Key를 입력하세요.'),
			admin: {
				condition: (_, siblingData) => siblingData?.executor === 'deterministic',
				description: '결정론적 checker registry에서 사용할 키입니다.',
			},
		},
		{
			name: 'model',
			type: 'select',
			options: [
				{ label: 'Opus', value: 'claude-opus-4-8' },
				{ label: 'Sonnet', value: 'claude-sonnet-5' },
				{ label: 'Haiku', value: 'claude-haiku-4-5' },
			],
			validate: requiredSelectFor('heuristic', 'Model을 선택하세요.'),
			admin: {
				condition: aiExecutorCondition,
				description:
					'AI 검수에 사용할 Anthropic 모델입니다. Advisory는 미설정 시 브랜드 담당자 확인으로 폴백합니다.',
			},
		},
		{
			name: 'prompt',
			type: 'textarea',
			admin: {
				condition: aiExecutorCondition,
				description:
					'AI에게 전달할 관찰·조언 지침입니다. Advisory는 이 프롬프트가 조언 관점을 정의합니다 (예: 타이포그래피 위계 관점에서 디자이너처럼 조언). 출력 형식과 판정 금지 규칙은 시스템이 강제합니다.',
			},
		},
	],
}
