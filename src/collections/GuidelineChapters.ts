import { type CollectionConfig, slugField } from 'payload'
import { assertGuidelineChapterDeletable } from '@/features/guideline/checks/validate-guideline-chapter-deletable'
import { managerManagedAccess } from '@/lib/auth'

/**
 * 가이드라인 토픽을 묶는 분류 단위. 사이드바와 인덱스 화면의 그룹이고 URL의 첫 조각이다.
 *
 * 🔴 **챕터는 문서가 아니라 분류다.** 2026-08-26까지는 `guideline-documents`의 최상위 문서였는데,
 *    제목·slug·순서 말고는 아무것도 갖지 않았고(설명·헤더이미지·블록·규칙 전수 0건) 자기 페이지는
 *    `/guideline` 인덱스가 그리는 것과 같은 것을 한 번 더 그리고 있었다. 그래서 컬렉션을 갈랐다.
 * 🔴 **자기 페이지를 갖지 않는다.** `/guideline/<chapter>`는 인덱스로 리다이렉트한다.
 *    본문을 주고 싶어지면 그건 챕터가 아니라 토픽이다.
 */
export const GuidelineChapters: CollectionConfig = {
	slug: 'guideline-chapters',
	dbName: 'guideline_chapters',
	labels: {
		singular: '가이드라인 챕터',
		plural: '가이드라인 챕터',
	},
	access: managerManagedAccess,
	hooks: {
		// chapter는 GuidelineDocuments에서 required — 참조 토픽이 있으면 삭제 대신 재분류를 안내한다.
		beforeDelete: [({ id, req }) => assertGuidelineChapterDeletable(req, Number(id))],
	},
	admin: {
		group: '가이드라인',
		useAsTitle: 'title',
		defaultColumns: ['title', 'slug', 'displayOrder', 'updatedAt'],
		description: '토픽을 묶는 분류입니다. 챕터 자체는 화면을 갖지 않습니다.',
	},
	defaultSort: 'displayOrder',
	fields: [
		{
			name: 'title',
			type: 'text',
			required: true,
			localized: true,
			admin: { description: '사이드바와 인덱스 카드의 제목으로 표시됩니다.' },
		},
		// 🔴 slug는 localized가 아니다(2026-09-04) — URL은 언어를 가리지 않는다(GuidelineDocuments 참조).
		slugField({
			useAsSlug: 'title',
			required: true,
		}),
		{
			name: 'topics',
			type: 'join',
			collection: 'guideline-documents',
			on: 'chapter',
		},
		{
			name: 'displayOrder',
			type: 'number',
			required: true,
			defaultValue: 0,
			min: 0,
			admin: {
				position: 'sidebar',
				description: '숫자가 낮을수록 목차에서 먼저 표시됩니다.',
			},
		},
	],
}
