/**
 * Agent가 가이드라인을 읽는 공개 입구 — 목록·검색 후보·문서 본문(팔레트 포함).
 * `guideline-documents`·`search`의 소유자는 guideline이라(docs/06 §2 R3) agent-chat은 이 서비스만 부른다.
 * 읽기 모델 변환(`toGuidelineReadDocument`)과 길이 정책은 호출자(agent-chat 서비스)가 갖는다.
 */
export {
	type AgentGuidelineDocument,
	type AgentGuidelineListItem,
	type AgentGuidelineSearchCandidate,
	findAgentGuidelineDocument,
	findGuidelineSearchPhraseCandidates,
	findGuidelineSearchTermCandidates,
	listGuidelineDocuments,
} from '../repositories/agent-guideline.payload.repository'
