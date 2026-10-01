// @vitest-environment node
import assert from 'node:assert/strict'
import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { User } from '@/payload-types'

// 명시적으로 지정한 일회용 로컬 DB에서만 실행한다. 기존/공유 콘텐츠를 작성하지 않는다.
const databaseURL = process.env.CMS_CONTRACT_TEST_URL
let payload: Payload
let chapter: number
let image: number
let manager: User
const suffix = Date.now()
describe.skipIf(!databaseURL)('신규 섹션 저장·미리보기', () => {
	beforeAll(async () => {
		const url = new URL(databaseURL ?? '')
		assert(['127.0.0.1', 'localhost'].includes(url.hostname))
		assert(url.pathname.startsWith('/lbs_cms_contract'))
		assert.equal(process.env.DATABASE_URL, databaseURL)
		const { getPayload } = await import('payload')
		const { default: config } = await import('@/payload.config')
		payload = await getPayload({ config })
		manager = await payload.create({
			collection: 'users',
			data: {
				email: `cms-${suffix}@example.test`,
				password: 'Test-only-password-42!',
				role: 'admin',
			},
		})
		chapter = (
			await payload.create({
				collection: 'guideline-chapters',
				locale: 'ko',
				data: { title: 'CMS test', slug: `cms-test-${suffix}`, displayOrder: 0 },
			})
		).id
		// 파일 전송 없이 메타데이터 픽스처만 만든다. 외부 스토리지에 쓰지 않는다.
		const asset = await payload.create({
			collection: 'brand-icons',
			draft: true,
			locale: 'ko',
			data: {
				name: '컨테이너선',
				filename: `test-ship-${suffix}.svg`,

				mimeType: 'image/svg+xml',
				_status: 'draft',
			},
		})
		image = asset.id
		await payload.update({
			collection: 'brand-icons',
			id: image,
			data: { _status: 'published' },
		})
	}, 60000)
	afterAll(async () => {
		if (payload) await payload.destroy()
	})

	it('Grid 기본값·카드 기본값을 저장하고 draft 미리보기와 게시본을 분리한다', async () => {
		const doc = await payload.create({
			collection: 'guideline-documents',
			locale: 'ko',
			overrideAccess: false,
			user: manager,
			data: {
				title: 'Iconography CMS',
				slug: `icons-${suffix}`,
				chapter,
				displayOrder: 0,
				_status: 'published',
				sections: [
					{ type: 'section', title: 'Line Type', download: { source: 'none' } },
					{
						type: 'subsection',
						title: 'Icons',
						anchor: 'icons',
						download: { source: 'assets' },
						containers: [
							{
								type: 'grid',
								columns: '5',
								size: 'xs',
								cards: [
									{
										ratio: '4:3',
										display: {
											type: 'image',
											image: { relationTo: 'brand-icons', value: image },
											fit: 'contain',
										},
										download: { source: 'assets' },
										caption: {
											type: 'specification',
											title: '컨테이너선',
											rows: [{ label: 'Stroke', value: '1px' }],
										},
									},
								],
							},
						],
					},
				],
			},
		})
		expect(doc.sections?.[0].containers?.[0]).toMatchObject({
			type: 'grid',
			columns: '3',
			size: 'md',
		})
		expect(doc.sections?.[1].containers?.[0].cards?.[0].display.scale).toBe(80)
		const { findPublishedTopicBySlug, listPublishedGuidelineNavigationTopics } = await import(
			'@/features/guideline/repositories/guideline-view.payload.repository'
		)
		const published = await findPublishedTopicBySlug(chapter, doc.slug)
		expect(published?.sections?.[1].containers?.[0].cards?.[0].caption?.rows).toEqual([
			expect.objectContaining({ label: 'Stroke', value: '1px' }),
		])
		const { sectionFiles } = await import('@/features/guideline/sections/model')
		assert(published?.sections?.[1])
		expect(sectionFiles(published.sections[1])).toHaveLength(1)
		const { listPublishedMcpGuidelineDocuments } = await import(
			'@/features/guideline/repositories/mcp-guideline.payload.repository'
		)
		const req = await createLocalReq({ user: { ...manager, collection: 'users' } }, payload)
		const mcpDocument = (await listPublishedMcpGuidelineDocuments(req, 'ko')).find(
			(item) => item.id === doc.id,
		)
		assert(mcpDocument?.sections?.[1])
		expect(sectionFiles(mcpDocument.sections[1])).toHaveLength(1)
		const { findAgentGuidelineDocument } = await import(
			'@/features/agent-chat/repositories/agent-guideline-context.payload.repository'
		)
		const agentDocument = await findAgentGuidelineDocument(manager, {
			collection: 'guideline-documents',
			id: String(doc.id),
		})
		assert(agentDocument?.document.sections?.[1])
		expect(sectionFiles(agentDocument.document.sections[1])).toHaveLength(1)

		expect(
			(await listPublishedGuidelineNavigationTopics()).find((item) => item.id === doc.id)
				?.sections,
		).toContainEqual(expect.objectContaining({ anchor: 'icons', title: 'Icons' }))
		await payload.update({
			collection: 'guideline-documents',
			id: doc.id,
			draft: true,
			autosave: true,
			locale: 'ko',
			data: { title: 'Draft title', _status: 'draft' },
		})
		const { getGuidelineTopicPreview } = await import(
			'@/features/guideline/services/get-guideline-document-preview.service'
		)
		expect(await getGuidelineTopicPreview(doc.id, manager)).toMatchObject({
			title: 'Draft title',
		})
		expect(await findPublishedTopicBySlug(chapter, doc.slug)).toMatchObject({
			title: 'Iconography CMS',
		})
		await expect(
			payload.update({
				collection: 'guideline-documents',
				id: doc.id,
				overrideAccess: false,
				user: { ...manager, role: 'worker' },
				data: { title: 'Forbidden' },
			}),
		).rejects.toThrow()
	})

	it('명세 그룹의 로케일·게시본·초안·버전에서 중첩 항목을 유지한다', async () => {
		const data = {
			title: 'Grouped specs',
			slug: `grouped-${suffix}`,
			chapter,
			displayOrder: 0,
			_status: 'published' as const,
			sections: [
				{
					type: 'section' as const,
					title: 'Typography',
					download: { source: 'none' as const },
					containers: [
						{
							type: 'sticky' as const,
							cards: [
								{
									ratio: '4:3' as const,
									download: { source: 'none' as const },
									display: {
										type: 'image' as const,
										image: { relationTo: 'brand-icons' as const, value: image },
									},
									caption: {
										type: 'specification' as const,
										rows: [{ label: 'Legacy', value: '보존' }],
									},
									specGroups: [
										{
											title: 'Headings',
											items: [{ label: 'Weight', value: 'Bold' }],
										},
										{
											title: 'Body',
											items: [{ label: 'Weight', value: 'Medium' }],
										},
									],
								},
							],
						},
					],
				},
			],
		}
		const doc = await payload.create({ collection: 'guideline-documents', locale: 'ko', data })
		const enSections = structuredClone(doc.sections ?? [])
		const card = enSections[0].containers?.[0].cards?.[0]
		assert(card)
		if (card.caption?.rows) {
			card.caption.rows = card.caption.rows.map(({ label, value }) => ({ label, value }))
		}
		card.specGroups = [{ title: 'English specs', items: [{ label: 'Weight', value: 'Light' }] }]
		await payload.update({
			collection: 'guideline-documents',
			id: doc.id,
			locale: 'en',
			data: { title: 'Grouped specs', sections: enSections, _status: 'published' },
		})
		const ko = await payload.findByID({
			collection: 'guideline-documents',
			id: doc.id,
			locale: 'ko',
			fallbackLocale: false,
			draft: false,
		})
		const koCard = ko.sections?.[0].containers?.[0].cards?.[0]
		expect(koCard?.specGroups).toMatchObject([
			{ title: 'Headings', items: [{ value: 'Bold' }] },
			{ title: 'Body', items: [{ value: 'Medium' }] },
		])
		expect(koCard?.caption?.rows).toMatchObject([{ label: 'Legacy', value: '보존' }])
		const en = await payload.findByID({
			collection: 'guideline-documents',
			id: doc.id,
			locale: 'en',
			fallbackLocale: false,
			draft: false,
		})
		expect(en.sections?.[0].containers?.[0].cards?.[0].specGroups).toMatchObject([
			{ title: 'English specs', items: [{ value: 'Light' }] },
		])
		await payload.update({
			collection: 'guideline-documents',
			id: doc.id,
			locale: 'ko',
			draft: true,
			autosave: true,
			data: { title: 'Draft grouped specs', _status: 'draft' },
		})
		const draft = await payload.findByID({
			collection: 'guideline-documents',
			id: doc.id,
			locale: 'ko',
			draft: true,
		})
		expect(draft.sections?.[0].containers?.[0].cards?.[0].specGroups).toEqual(
			koCard?.specGroups,
		)
		const versions = await payload.findVersions({
			collection: 'guideline-documents',
			where: { parent: { equals: doc.id } },
			locale: 'ko',
		})
		expect(
			versions.docs[0].version.sections?.[0].containers?.[0].cards?.[0].specGroups,
		).toEqual(koCard?.specGroups)
		await expect(
			payload.create({
				collection: 'guideline-documents',
				locale: 'ko',
				data: {
					...data,
					slug: `invalid-grouped-${suffix}`,
					sections: [
						{
							...data.sections[0],
							containers: [
								{
									type: 'grid',
									cards: [
										{
											...data.sections[0].containers[0].cards[0],
											caption: { type: 'specification' },
											specGroups: [{ title: 'Empty', items: [] }],
										},
									],
								},
							],
						},
					],
				},
			}),
		).rejects.toThrow()
	})

	it('API 응답에서 구형 필드를 숨기고 legacy 쓰기와 버전 복원을 거절한다', async () => {
		const doc = await payload.create({
			collection: 'guideline-documents',
			locale: 'ko',
			data: {
				title: 'Restore guard',
				slug: `restore-${suffix}`,
				chapter,
				displayOrder: 0,
				sections: [],
				_status: 'published',
			},
		})
		expect(doc).not.toHaveProperty('contentModel')
		expect(doc).not.toHaveProperty('blocks')
		for (const data of [{ contentModel: 'legacy' as const }, { blocks: [] }]) {
			await expect(
				payload.update({ collection: 'guideline-documents', id: doc.id, data }),
			).rejects.toThrow('기존 본문 형식')
		}
		const versions = await payload.findVersions({
			collection: 'guideline-documents',
			where: { parent: { equals: doc.id } },
			showHiddenFields: true,
		})
		const version = versions.docs[0]
		assert(version)
		// 일회용 테스트 DB의 이력 표식만 바꿔 실제 과거 버전 복원 경로를 재현합니다.
		for (const contentModel of ['legacy', null] as const) {
			await payload.db.updateVersion({
				collection: 'guideline-documents',
				id: version.id,
				versionData: { version: { ...version.version, contentModel } },
			})
			await expect(
				payload.restoreVersion({ collection: 'guideline-documents', id: version.id }),
			).rejects.toThrow('기존 본문 형식')
		}
		await payload.db.updateVersion({
			collection: 'guideline-documents',
			id: version.id,
			versionData: { version: { ...version.version, contentModel: 'sections' } },
		})
		await expect(
			payload.restoreVersion({ collection: 'guideline-documents', id: version.id }),
		).resolves.toMatchObject({ id: doc.id, sections: [] })
	})

	it('첫 서브섹션과 중복 앵커를 거부한다', async () => {
		const data = {
			title: 'Invalid',
			slug: `invalid-${suffix}`,
			chapter,
			displayOrder: 0,
			_status: 'published' as const,
		}
		await expect(
			payload.create({
				collection: 'guideline-documents',
				data: {
					...data,
					sections: [
						{ type: 'subsection', title: 'Orphan', download: { source: 'none' } },
					],
				},
			}),
		).rejects.toThrow()
		await expect(
			payload.create({
				collection: 'guideline-documents',
				data: {
					...data,
					sections: [
						{
							type: 'section',
							title: 'A',
							anchor: 'same',
							download: { source: 'none' },
						},
						{
							type: 'subsection',
							title: 'B',
							anchor: 'same',
							download: { source: 'none' },
						},
					],
				},
			}),
		).rejects.toThrow()
	})

	it('캐러셀·스티키·동적 카드와 팔레트 분류를 저장하고 잘못된 입력을 거부한다', async () => {
		const asset = { relationTo: 'brand-icons' as const, value: image }
		const color = await payload.create({
			collection: 'brand-colors',
			locale: 'ko',
			data: { name: 'CMS color', hex: '#007A3E', _status: 'published' },
		})
		const existingGroups = await payload.find({
			collection: 'brand-color-groups',
			where: { family: { equals: 'primary' } },
			limit: 1,
		})
		const groupData = {
			name: '이름이 바뀌어도 Primary',
			family: 'primary' as const,
			colors: [color.id],
			_status: 'published' as const,
		}
		if (existingGroups.docs[0]) {
			await payload.update({
				collection: 'brand-color-groups',
				id: existingGroups.docs[0].id,
				locale: 'ko',
				data: groupData,
			})
		} else {
			await payload.create({
				collection: 'brand-color-groups',
				locale: 'ko',
				data: groupData,
			})
		}
		const layoutImage = await payload.create({
			collection: 'application-images',
			locale: 'ko',
			draft: true,
			data: {
				name: 'Layout',
				alt: '레이아웃 표본',
				filename: `layout-${suffix}.png`,
				mimeType: 'image/png',
				width: 800,
				height: 600,
				_status: 'draft',
			},
		})
		await payload.update({
			collection: 'application-images',
			id: layoutImage.id,
			data: { _status: 'published' },
		})
		const displays = [
			{ type: 'guide' as const, image: asset, guide: asset, dimBackground: true },
			{ type: 'layout-grid' as const, sample: 'b' as const, marginPct: 5 },
			{
				type: 'type-weight' as const,
				weight: 'bold' as const,
				languages: [{ language: 'ko' as const }, { language: 'en' as const }],
			},
			{ type: 'palette' as const, palette: 'primary' as const, variant: 'swatches' as const },
			{
				type: 'palette' as const,
				palette: 'primary' as const,
				variant: 'logo-backgrounds' as const,
				logos: { default: asset, white: asset, mono: asset },
			},
			{ type: 'swatch' as const, color: color.id },
			{
				type: 'logo-background' as const,
				palette: 'primary' as const,
				logos: { black: asset, white: asset },
				opacity: 0.5,
			},
			{ type: 'layout-overlay' as const, images: [layoutImage.id] },
		]
		const doc = await payload.create({
			collection: 'guideline-documents',
			locale: 'ko',
			user: manager,
			overrideAccess: false,
			data: {
				title: 'Dynamic CMS',
				slug: `dynamic-${suffix}`,
				chapter,
				displayOrder: 1,
				_status: 'published',
				sections: [
					{
						type: 'section',
						title: 'Dynamic',
						download: { source: 'none' },
						containers: [
							{
								type: 'carousel',
								navigation: 'labels',
								cards: displays.map((display, index) => ({
									ratio: '4:3',
									download: { source: 'none' },
									caption: { type: 'basic' },
									selectionLabel: `표본 ${index}`,
									backgroundColor: color.id,
									foregroundColor: color.id,
									endActions: [
										{
											type: 'link',
											label: '그래프 도구',
											href: '/studio/graph',
										},
										{
											type: 'copy',
											label: '규정 복사',
											value: '원본을 유지합니다.',
										},
									],
									display,
								})),
							},
							{
								type: 'sticky',
								cards: [
									{
										ratio: '4:3',
										display: { type: 'type-weight' },
										download: { source: 'none' },
										caption: { type: 'basic' },
									},
								],
							},
						],
					},
				],
			},
		})
		expect(doc.sections?.[0].containers?.[0]).toMatchObject({
			type: 'carousel',
			height: 'md',
			loop: true,
			autoplay: false,
		})
		expect(doc.sections?.[0].containers?.[1]).toMatchObject({
			type: 'sticky',
			stickyMode: 'switch',
		})
		const { getGuidelineTopicPreview } = await import(
			'@/features/guideline/services/get-guideline-document-preview.service'
		)
		const preview = await getGuidelineTopicPreview(doc.id, manager)
		expect(preview?.paletteCatalog?.primary?.colors[0].value).toBe('#007A3E')
		expect(preview?.sections?.[0].containers?.[0].cards?.[2].display.languages).toEqual([
			expect.objectContaining({ language: 'ko' }),
			expect.objectContaining({ language: 'en' }),
		])
		expect(preview?.sections?.[0].containers?.[0].cards?.[2]).toMatchObject({
			backgroundColor: { id: color.id, hex: '#007A3E' },
			foregroundColor: { id: color.id, hex: '#007A3E' },
			endActions: [
				{ type: 'link', label: '그래프 도구', href: '/studio/graph' },
				{ type: 'copy', label: '규정 복사', value: '원본을 유지합니다.' },
			],
		})
		const container = doc.sections?.[0].containers?.[0]
		assert(container)
		const validCard = container.cards?.[2]
		assert(validCard)
		for (const invalid of [
			...(
				[
					{ type: 'link', label: 'Invalid', href: 'javascript:alert(1)' },
					{ type: 'copy', label: 'Empty', value: ' ' },
					{ type: 'copy', label: ' ', value: 'Valid value' },
				] as const
			).map((action) => ({ ...container, cards: [{ ...validCard, endActions: [action] }] })),
			{ ...container, cards: [{ ...validCard, backgroundColor: 99999999 }] },
			{
				...container,
				cards: [{ ratio: '4:3' as const, display: { type: 'type-weight' as const } }],
			},
			{
				...container,
				navigation: 'counter' as const,
				cards: [
					{ ratio: '4:3' as const, display: { type: 'guide' as const, image: asset } },
				],
			},
			{
				...container,
				navigation: 'counter' as const,
				cards: [{ ratio: '4:3' as const, display: { type: 'logo-background' as const } }],
			},
			{
				...container,
				navigation: 'counter' as const,
				cards: [
					{
						ratio: '4:3' as const,
						display: { type: 'image' as const, image: { ...asset, value: 99999999 } },
					},
				],
			},
		]) {
			await expect(
				payload.update({
					collection: 'guideline-documents',
					id: doc.id,
					data: {
						_status: 'published',
						sections: [{ type: 'section', title: 'Invalid', containers: [invalid] }],
					},
				}),
			).rejects.toThrow()
		}
	})
})
