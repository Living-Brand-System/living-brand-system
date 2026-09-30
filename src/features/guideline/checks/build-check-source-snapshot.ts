import type { GuidelineDocument } from '@/payload-types'
import { type CheckSourceSnapshot, snapshotBlock } from '../blocks/projection'
import { projectSection } from '../sections/projection'
import { relationshipId } from '../utils/block-text'

export type GuidelineCheckDocument = Pick<
	GuidelineDocument,
	'blocks' | 'rules' | 'headerImage' | 'id' | 'contentModel' | 'sections'
>

/** Section/Page 전체 또는 blockId가 가리키는 단일 Block을 Check source로 정규화한다. */
export function buildCheckSourceSnapshot(
	document: GuidelineCheckDocument,
	blockId?: string | null,
): CheckSourceSnapshot | null {
	const blocks = document.contentModel === 'sections' ? [] : (document.blocks ?? [])
	const sections = document.contentModel === 'sections' ? (document.sections ?? []) : []
	if (blockId) {
		const block = blocks.find((candidate) => candidate.id === blockId)
		const section = sections.find((candidate) => candidate.id === blockId)
		return section ? projectSection(section) : block ? snapshotBlock(block) : null
	}

	const blockSnapshots = [...blocks.map(snapshotBlock), ...sections.map(projectSection)]
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
