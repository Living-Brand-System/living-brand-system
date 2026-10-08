/**
 * Agent가 published 템플릿을 읽는 공개 입구 — 요청에 맞는 템플릿 찾기·슬롯 스펙 읽기.
 * `templates`의 소유자는 template-core라(docs/06 §2 R3) agent-chat은 이 서비스만 부른다.
 * 어느 템플릿을 고르고 슬롯을 어떻게 요약하는지는 호출자(agent-chat 서비스)가 갖는다.
 */
export {
	type AgentTemplateDocument,
	findAgentTemplate,
	listAgentTemplates,
} from '../repositories/agent-template.payload.repository'
