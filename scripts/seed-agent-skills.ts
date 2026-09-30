/**
 * AI Chat이 선택할 기본 Agent Skill 5종을 upsert한다.
 * 기존 reference 연결과 목록 밖 Skill은 보존하고, 이전 표시명 Skill은 비활성화한다.
 * 실행: pnpm payload run scripts/seed-agent-skills.ts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const LEGACY_SKILL_NAMES = ['Template Asset Creator', 'Guideline Curator', 'Image Check']

const SKILLS = [
	{
		name: 'answer-guideline',
		description:
			'발행된 브랜드 규정, 가이드라인 문서, 허용·금지 사용법 또는 Check 기준을 묻는 요청에 사용합니다.',
		body: `# Answer Guideline

발행된 브랜드 가이드라인을 근거로 정확하게 답합니다.

## Workflow

1. 브랜드별 사실이나 규정을 답하려면 먼저 \`searchGuidelines\`로 핵심 검색어를 조회합니다.
2. 결과가 없으면 더 짧은 검색어로 다시 찾고, 그래도 없으면 \`listGuidelineDocuments\`로 문서 목록을 확인합니다.
3. 답변 근거가 될 문서는 \`readGuidelineDocument\`로 읽습니다.
4. 검수 항목이나 판정 기준을 묻는 경우 \`getCheckCatalog\`을 사용합니다.

## Response rules

- 발행된 근거에서 확인한 내용과 일반적인 제안을 구분합니다.
- 근거를 찾지 못한 브랜드 규정은 추측하지 않고 확인할 수 없다고 답합니다.
- 핵심 답변을 먼저 제시하고, 근거 문서와 적용 조건을 짧게 덧붙입니다.
- 에셋 생성이나 이미지 검수 요청에는 이 Skill을 사용하지 않습니다.`,
	},
	{
		name: 'create-from-template',
		description:
			'발행된 템플릿으로 이미지·에셋을 만드는 요청에 사용합니다. 썸네일, 유튜브 썸네일, SNS 게시물, 포스터, 배너, 발표 표지, 명함, 카드처럼 만들 결과물을 말하거나 제목·문구·이미지 내용을 주는 요청이 여기 해당합니다. 문구만 다듬거나 이미지 후보만 만드는 요청, 브랜드 규정 질의에는 사용하지 않습니다.',
		body: `# Create From Template

기존에 발행된 템플릿을 찾아 허용된 슬롯만 채웁니다. 새 템플릿을 설계하거나 잠긴 요소를 변경하지 않습니다.

## Workflow

1. \`findTemplatesForRequest\`로 템플릿 목록과 열린 슬롯을 확인합니다.
2. 요청에 가장 맞는 템플릿을 **직접 고릅니다.** 용도(카테고리), 크기와 방향, 열린 슬롯 구성을 근거로 판단합니다. 되묻지 않습니다.
3. 열린 슬롯의 값을 **직접 작성합니다.** 사용자가 말하지 않은 값도 요청 맥락에서 지어냅니다.
4. 슬롯의 형식, 길이, 줄 수, AI 지시문을 지킵니다.
5. \`prepareTemplateImage\`를 호출합니다. 텍스트 슬롯은 \`text\`, 이미지 슬롯은 \`imagePrompt\`(그 자리에 무엇이 보일지 한 문장)를 채웁니다.

## Response rules

- **한 번의 요청은 한 번의 호출로 끝냅니다.** 값을 물어보고 기다리지 않습니다.
- 요청에 정보가 부족해도 합리적인 값으로 채워 결과를 먼저 보여 주고, 무엇을 임의로 정했는지 한 줄로 알립니다.
- 열린 슬롯은 비워 두지 않습니다. 이미지 슬롯이 있으면 \`imagePrompt\`를 반드시 채웁니다.
- 조회 결과에 없는 templateId나 슬롯을 만들지 않습니다.
- 잠긴 요소나 템플릿 구조를 변경할 수 있다고 말하지 않습니다.
- 첨부의 「스튜디오에 적용」을 누르면 값이 스튜디오에 반영되고 이미지 슬롯은 그 프롬프트로 생성됩니다. 결과를 안내할 때 그 한 줄을 덧붙입니다.`,
	},
	{
		name: 'generate-image',
		description:
			'텍스트 요청으로 새로운 이미지 후보를 생성하거나 브랜드 이미지 프로파일을 적용하는 요청에 사용합니다.',
		body: `# Generate Image

사용자 요청에 맞는 새 이미지 후보를 생성합니다. 생성 결과가 브랜드 규정을 통과했다고 판정하지 않습니다.

## Workflow

1. 브랜드 스타일이 필요한 요청이면 \`listImageProfiles\`로 사용 가능한 프로파일을 확인합니다.
2. 요청과 일치하는 프로파일이 명확하면 해당 profileId를 사용하고, 애매하면 사용자에게 선택을 요청합니다.
3. 브랜드 프로파일이 필요 없는 자유 생성은 사용자가 명확히 요청한 경우에만 profileId를 생략합니다.
4. 주제, 장면, 용도처럼 생성에 꼭 필요한 정보가 없을 때만 짧게 질문합니다.
5. \`generateImage\`로 후보를 생성하고 실제 반환된 결과만 안내합니다.

## Response rules

- 존재하지 않는 profileId를 만들지 않습니다.
- 생성 실패나 빈 결과를 성공으로 표현하지 않습니다.
- 이미지 생성과 브랜드 검수는 구분하며, 검수가 필요하면 별도 검수를 제안합니다.
- 사용자가 요청하지 않은 민감 정보나 브랜드 주장을 프롬프트에 추가하지 않습니다.`,
	},
	{
		name: 'generate-text',
		description: '브랜드 카피, 제목, 설명문, 이름 후보를 작성·축약·변형하는 요청에 사용합니다.',
		body: `# Generate Text

요청한 목적, 말투, 언어와 길이에 맞는 텍스트를 작성합니다.

## Workflow

1. 용도, 독자, 말투, 언어, 글자 수처럼 결과를 바꾸는 필수 조건을 확인합니다.
2. 요청이 특정 브랜드 규정에 의존하면 \`searchGuidelines\`와 \`readGuidelineDocument\`로 근거를 확인합니다.
3. 별도 개수 요청이 없으면 서로 차이가 분명한 후보를 최대 3개 제시합니다.
4. 수정 요청에는 기존 문장의 의도와 필수 정보를 보존합니다.

## Response rules

- 요청한 형식과 길이 제한을 우선합니다.
- 설명보다 바로 사용할 수 있는 결과를 먼저 제시합니다.
- 근거 없는 효능, 법률, 수치 또는 승인 표현을 만들지 않습니다.
- 브랜드 근거를 찾지 못하면 일반 카피 제안임을 밝힙니다.`,
	},
	{
		name: 'review-asset',
		description:
			'첨부 이미지가 브랜드 Check 기준에 맞는지 검수하고 결과와 수정 방향을 설명하는 요청에 사용합니다.',
		body: `# Review Asset

사용자가 첨부한 최신 이미지를 발행된 Check 기준으로 검수합니다.

## Workflow

1. 검수할 이미지가 없으면 먼저 첨부를 요청합니다.
2. 적용할 scenarioKey가 명확하지 않으면 \`listCheckScenarios\`로 지원 시나리오를 확인합니다.
3. 요청과 일치하는 시나리오가 명확하면 \`runCheck\`를 호출하고, 애매하면 선택을 요청합니다.
4. 기준 설명이 더 필요할 때만 \`getCheckCatalog\`을 사용합니다.
5. 결과의 완료 여부, 항목별 상태, 충족도와 pending 항목을 확인한 뒤 요약합니다.

## Response rules

- 불완전하거나 pending인 결과를 통과로 표현하지 않습니다.
- \`fail\`과 \`needs_review\`를 구분하고, 측정할 수 없음을 위반으로 단정하지 않습니다.
- 수정 제안은 실제 Check 결과와 근거에 연결합니다.
- 검수 결과가 공식 승인이나 법적 확인을 대신한다고 말하지 않습니다.`,
	},
] as const

if (new Set(SKILLS.map(({ name }) => name)).size !== SKILLS.length) {
	throw new Error('Agent skill seed names must be unique.')
}

const payload = await getPayload({ config })

for (const skill of SKILLS) {
	const existing = await payload.find({
		collection: 'agent-skills',
		depth: 0,
		limit: 1,
		overrideAccess: true,
		where: { name: { equals: skill.name } },
	})
	const data = {
		name: skill.name,
		description: skill.description,
		body: skill.body,
		enabled: true,
	}

	if (existing.docs[0]) {
		await payload.update({
			collection: 'agent-skills',
			id: existing.docs[0].id,
			data,
			overrideAccess: true,
		})
		console.log(`updated: ${skill.name}`)
	} else {
		await payload.create({
			collection: 'agent-skills',
			data,
			overrideAccess: true,
		})
		console.log(`created: ${skill.name}`)
	}
}

const legacySkills = await payload.find({
	collection: 'agent-skills',
	depth: 0,
	limit: LEGACY_SKILL_NAMES.length,
	overrideAccess: true,
	where: {
		and: [{ name: { in: LEGACY_SKILL_NAMES } }, { enabled: { equals: true } }],
	},
})

for (const skill of legacySkills.docs) {
	await payload.update({
		collection: 'agent-skills',
		id: skill.id,
		data: { enabled: false },
		overrideAccess: true,
	})
	console.log(`disabled: ${skill.name}`)
}

console.log('done')
process.exit(0)
