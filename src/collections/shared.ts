import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

/** 공용 versions 프리셋 — draft + 발행 예약, 문서당 이력 50개 유지. */
export const draftVersions: CollectionConfig['versions'] = {
	drafts: {
		schedulePublish: true,
	},
	maxPerDoc: 50,
}

/** 가이드라인 versions 프리셋 — 편집 내용을 2초 간격으로 자동 저장한다. */
export const guidelineDraftVersions: CollectionConfig['versions'] = {
	drafts: {
		autosave: {
			interval: 2000,
			showSaveDraftButton: true,
		},
		schedulePublish: true,
	},
	maxPerDoc: 50,
}

/**
 * 버전 복원이 발행을 풀지 않게 한다. Payload 복원은 그 버전의 `_status`까지 본문에 덮어써서,
 * 초안 버전을 복원하면 발행 문서가 초안이 되어 스튜디오에서 사라진다. 발행 중이던 문서는 복원한
 * 내용으로 발행을 유지한다. 🔴 발행 검증 훅보다 **앞에** 둬야 복원본도 발행 검증을 거친다.
 */
export const keepPublishedOnRestore: CollectionBeforeChangeHook = ({
	context,
	data,
	originalDoc,
}) => {
	if (context.isRestoringVersion && originalDoc?._status === 'published')
		data._status = 'published'
	return data
}
