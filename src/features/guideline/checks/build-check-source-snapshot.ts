import type { GuidelineDocument } from '@/payload-types'
import { projectSection } from '../sections/projection'
import type { CheckSourceSnapshot } from './check-source'

export type GuidelineCheckDocument = Pick<GuidelineDocument, 'rules' | 'id' | 'sections'>

/** 문서 전체 또는 blockId가 가리키는 단일 섹션을 Check source로 정규화한다. */
export function buildCheckSourceSnapshot(
	document: GuidelineCheckDocument,
	blockId?: string | null,
): CheckSourceSnapshot | null {
	const sections = document.sections ?? []
	if (blockId) {
		const section = sections.find((candidate) => candidate.id === blockId)
		if (!section) return null
		const { evidence, referenceAssets } = projectSection(section)
		return { evidence, referenceAssets }
	}

	const blockSnapshots = sections.map(projectSection)

	return {
		evidence: {
			type: 'document',
			blocks: blockSnapshots.map((snapshot) => snapshot.evidence),
		},
		// 헤더 이미지는 가이드라인 첫 화면의 카드 썸네일이라 검수 근거로 싣지 않는다.
		referenceAssets: blockSnapshots.flatMap((snapshot) => snapshot.referenceAssets),
	}
}
