import type { GuidelineDocument } from '@/payload-types'
import { projectSection } from '../sections/projection'
import { relationshipId } from '../utils/block-text'
import type { CheckSourceSnapshot } from './check-source'

export type GuidelineCheckDocument = Pick<
	GuidelineDocument,
	'rules' | 'headerImage' | 'id' | 'sections'
>

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
	const headerImage = document.headerImage
	const headerImageId = relationshipId(headerImage)

	return {
		evidence: {
			type: 'document',
			blocks: blockSnapshots.map((snapshot) => snapshot.evidence),
		},
		referenceAssets: [
			...(headerImageId == null ? [] : [{ id: headerImageId, role: 'context' as const }]),
			...blockSnapshots.flatMap((snapshot) => snapshot.referenceAssets),
		].filter(
			(asset, index, assets) =>
				assets.findIndex(
					(candidate) => candidate.id === asset.id && candidate.role === asset.role,
				) === index,
		),
	}
}
