'use client'

import Link from 'next/link'
import { type ReactNode, useState } from 'react'
import { applyImportedLayerDefaults } from '@/components/admin/templates/template-layers'
import {
	DataEditor,
	type DataEditorColumn,
	DataEditorTable,
} from '@/components/studio/shared/data-editor'
import {
	EMPTY_TEMPLATE_FORM,
	parseTemplateSize,
	type TemplateFormValues,
	TemplateInfoFields,
} from '@/components/studio/template/template-info-fields'
import { TemplateInfoForm } from '@/components/studio/template/template-info-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { composeTemplateHtml } from '@/features/template-core/runtime/compose-template-html.client'
import {
	type TemplateRecordsState,
	useTemplateRecords,
} from '@/features/template-customization/hooks/use-template-records'
import type {
	TemplateCreateInput,
	TemplateRecord,
} from '@/features/template-customization/services/template-records.client'
import {
	type ImportedFigmaHtml,
	requestFigmaHtmlImport,
} from '@/features/template-import/services/import-figma-html.client'
import { getStudioTemplateRoute } from '@/lib/routes'

/**
 * 템플릿 데이터 편집 — 목록·생성·수정을 모달 하나에서 다 다룬다(사용자 2026-10-13 「한 화면에서 다」).
 * 템플릿 첫 화면과 편집 화면이 같은 모달을 쓰고, 편집 화면은 지금 그 템플릿의 수정 탭으로 연다.
 */
export function TemplateDataEditor({
	currentTemplateId,
	trigger,
}: {
	currentTemplateId?: number
	trigger?: (open: () => void) => ReactNode
}) {
	const records = useTemplateRecords()
	return (
		<DataEditor
			subject="템플릿"
			trigger={trigger}
			initial={
				currentTemplateId === undefined
					? undefined
					: { tabId: TEMPLATE_ITEM_TAB, itemId: currentTemplateId }
			}
			tabs={[
				{
					id: 'list',
					label: '목록',
					render: ({ goTo }) => (
						<TemplateList
							records={records}
							onCreate={() => goTo('create')}
							onEdit={(id) => goTo(TEMPLATE_ITEM_TAB, id)}
						/>
					),
				},
				{
					id: 'create',
					label: '생성',
					render: ({ goTo }) => (
						<TemplateCreateForm records={records} onDone={() => goTo('list')} />
					),
				},
				{
					id: TEMPLATE_ITEM_TAB,
					label: '수정',
					render: ({ itemId }) =>
						itemId ? (
							<TemplateInfoForm
								key={itemId}
								templateId={Number(itemId)}
								onSaved={records.reload}
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								목록에서 고칠 템플릿의 「수정」을 눌러 주세요.
							</p>
						),
				},
			]}
		/>
	)
}

function TemplateList({
	records,
	onCreate,
	onEdit,
}: {
	records: TemplateRecordsState
	onCreate: () => void
	onEdit: (templateId: number) => void
}) {
	const categoryTitle = (id: number | null) =>
		records.categories.find((category) => category.id === id)?.title ?? '—'

	const columns: DataEditorColumn<TemplateRecord>[] = [
		{
			key: 'name',
			header: '이름',
			cell: (row) => <TemplateNameCell row={row} />,
		},
		{ key: 'category', header: '카테고리', cell: (row) => categoryTitle(row.categoryId) },
		{ key: 'size', header: '판형', cell: formatTemplateSize },
		{
			key: 'status',
			header: '상태',
			cell: (row) => (row.status === 'published' ? '게시' : '초안'),
		},
		{
			key: 'updatedAt',
			header: '수정일',
			cell: (row) => new Date(row.updatedAt).toLocaleString('ko-KR'),
		},
		{
			key: 'actions',
			header: '',
			cell: (row) => (
				<div className="flex justify-end gap-1">
					{row.status === 'published' && (
						<Button asChild variant="ghost" size="sm">
							<Link href={getStudioTemplateRoute(row.slug)}>열기</Link>
						</Button>
					)}
					<Button variant="outline" size="sm" onClick={() => onEdit(row.id)}>
						수정
					</Button>
					<Button
						variant="destructive"
						size="sm"
						disabled={records.busy}
						onClick={() => {
							// ponytail: 브라우저 확인창 — 휴지통 화면이 생기면 거기서 되살리기를 함께 안내한다.
							if (
								window.confirm(
									`「${row.name}」을 휴지통으로 옮길까요? 모든 사용자의 목록에서 사라져요.`,
								)
							) {
								records.trash(row.id).catch(() => {})
							}
						}}
					>
						삭제
					</Button>
				</div>
			),
		},
	]

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				<RecordsError error={records.error} />
				<Button size="sm" className="ml-auto" onClick={onCreate}>
					템플릿 생성
				</Button>
			</div>
			<DataEditorTable
				columns={columns}
				rows={records.records}
				rowKey={(row) => row.id}
				empty="템플릿이 없어요."
			/>
		</div>
	)
}

/** 썸네일 + 이름 — 행 높이는 글자 두 줄(썸네일 40px), 이름만으로는 뭔지 모르니 그림을 함께 둔다(사용자 2026-10-13). */
function TemplateNameCell({ row }: { row: TemplateRecord }) {
	return (
		<div className="flex items-center gap-3">
			<div className="size-10 shrink-0 overflow-hidden bg-muted">
				{row.previewImage && (
					// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
					<img
						src={row.previewImage.url}
						alt={row.previewImage.alt}
						className="size-full object-cover"
					/>
				)}
			</div>
			<span className="font-medium">{row.name}</span>
		</div>
	)
}

function TemplateCreateForm({
	records,
	onDone,
}: {
	records: TemplateRecordsState
	onDone: () => void
}) {
	const [sourceUrl, setSourceUrl] = useState('')
	const [imported, setImported] = useState<ImportedFigmaHtml | null>(null)
	const [importing, setImporting] = useState(false)
	const [importError, setImportError] = useState<string | null>(null)
	const [fields, setFields] = useState<TemplateFormValues>(EMPTY_TEMPLATE_FORM)
	const set = (patch: Partial<TemplateFormValues>) => setFields((prev) => ({ ...prev, ...patch }))

	const importFrame = async () => {
		setImporting(true)
		setImportError(null)
		try {
			const result = await requestFigmaHtmlImport(sourceUrl)
			setImported(result)
			set({ name: result.name })
		} catch (cause) {
			setImportError(cause instanceof Error ? cause.message : 'Figma 가져오기에 실패했어요.')
		} finally {
			setImporting(false)
		}
	}

	const input = imported ? buildTemplateCreateInput(imported, sourceUrl, fields) : null

	return (
		<FieldGroup>
			<Field>
				<FieldLabel htmlFor="template-create-source">Figma URL</FieldLabel>
				<div className="flex gap-2">
					<Input
						id="template-create-source"
						placeholder="https://www.figma.com/design/...?node-id=..."
						value={sourceUrl}
						onChange={(event) => {
							setSourceUrl(event.target.value)
							setImported(null)
						}}
					/>
					<Button
						variant="outline"
						disabled={importing || !sourceUrl.trim()}
						onClick={importFrame}
					>
						{importing ? '가져오는 중…' : '가져오기'}
					</Button>
				</div>
				<FieldDescription>
					{importError ??
						(imported
							? `가져왔어요 — 「${imported.name}」 ${imported.width}×${imported.height}px. 아래를 채우고 만들어 주세요.`
							: '내 계정에 등록한 Figma 토큰으로 프레임을 읽어요. node-id가 있는 주소여야 해요.')}
				</FieldDescription>
			</Field>

			{imported && (
				<>
					<TemplateInfoFields
						idPrefix="template-create"
						values={fields}
						onChange={set}
						categories={records.categories}
						figmaSize={imported}
						hideDigitalSize
					/>
					<div className="flex items-center justify-end gap-2">
						<RecordsError error={records.error} />
						<Button
							disabled={!input || records.busy}
							onClick={() => {
								if (!input) return
								records
									.create(input)
									.then(() => {
										setSourceUrl('')
										setImported(null)
										setFields(EMPTY_TEMPLATE_FORM)
										onDone()
									})
									.catch(() => {})
							}}
						>
							{records.busy ? '만드는 중…' : '만들고 게시'}
						</Button>
					</div>
				</>
			)}
		</FieldGroup>
	)
}

function RecordsError({ error }: { error: string | null }) {
	if (!error) return null
	return (
		<p role="alert" className="text-sm text-destructive">
			{error}
		</p>
	)
}

/** 수정 탭 id — 주소에 `?edit=item&edit-item=<id>`로 남는다. */
const TEMPLATE_ITEM_TAB = 'item'

/**
 * 가져온 Figma 판과 폼 값을 저장 hook이 받는 새 템플릿으로 — admin 「가져오기」 필드와 같은 조립이다
 * (레이어 기본값 → 합성 html). 아직 못 만드는 상태(이름·카테고리·인쇄 크기 없음)면 `null`.
 */
export function buildTemplateCreateInput(
	imported: Pick<ImportedFigmaHtml, 'html' | 'width' | 'height'>,
	sourceUrl: string,
	fields: TemplateFormValues,
): TemplateCreateInput | null {
	const name = fields.name.trim()
	if (!name || !fields.category) return null
	const printSize = parseTemplateSize(fields)
	if (fields.outputKind === 'print' && !printSize) return null

	const overrides = applyImportedLayerDefaults(imported.html, {})
	return {
		name,
		...(fields.slug.trim() ? { slug: fields.slug.trim() } : {}),
		...(fields.description.trim() ? { description: fields.description.trim() } : {}),
		category: fields.category,
		outputKind: fields.outputKind,
		sourceUrl,
		baseHtml: imported.html,
		html: composeTemplateHtml(imported.html, overrides),
		overrides,
		width: imported.width,
		height: imported.height,
		...(fields.outputKind === 'print' && printSize ? { size: printSize } : {}),
	}
}

function formatTemplateSize(row: TemplateRecord): string {
	if (row.outputKind === 'print' && row.size?.width && row.size.height) {
		return `인쇄 ${row.size.width}×${row.size.height}mm`
	}
	return `디지털 ${row.size?.width ?? row.width}×${row.size?.height ?? row.height}px`
}
