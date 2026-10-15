'use client'

import { Renew, TrashCan } from '@carbon/icons-react'
import { useRef, useState } from 'react'
import { openDataEditorTab } from '@/components/studio/shared/data-editor'
import { FOUNDATION_TABS } from '@/components/studio/template/foundation-editor'
import { ManagerLinkForm } from '@/components/studio/template/manager-forms/link-form'
import { reimportTemplateFromFigma } from '@/components/studio/template/manager-forms/template-html-writes'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Typography } from '@/components/ui/typography'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import {
	type TemplateRecordState,
	useTemplateRecord,
} from '@/features/template-customization/hooks/use-template-record'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateRecord } from '@/features/template-customization/services/template-records.client'
// 서버 slug 검증과 같은 규칙 — 초안은 서버 검증을 건너뛰어 여기서 먼저 막는다.
import { SLUG_PATTERN } from '@/lib/slug'

const adminTemplateHref = (templateId: number) => `/admin/collections/templates/${templateId}`


/**
 * 선택 카드 제목의 관리 폼(`name:`) — 템플릿 이름·주소·설명. 칸을 벗어날 때 초안에 쌓는다.
 * 주소는 Manager mode를 끄며 저장할 때 바뀌고, 그때 새 주소로 옮겨 간다(레일).
 */
export function TemplateNameManagerForm() {
	const { config } = useTemplateStudio()
	const state = useTemplateRecord(config.id)
	if (!state.record) return <FormNote error={state.error} loading />
	return <NameFormBody record={state.record} state={state} />
}

function NameFormBody({ record, state }: { record: TemplateRecord; state: TemplateRecordState }) {
	const [name, setName] = useState(record.name)
	const [slug, setSlug] = useState(record.slug)
	const [description, setDescription] = useState(record.description ?? '')
	const nameValid = name.trim() !== ''
	const slugValid = SLUG_PATTERN.test(slug.trim())
	// 고친 칸만 보낸다 — 열 때 읽은 판형·카테고리를 되쓰면 그 사이 다른 곳에서 바꾼 값을 덮는다.
	const patch =
		nameValid && slugValid
			? { name: name.trim(), slug: slug.trim(), description: description.trim() }
			: null
	const written = useRef(JSON.stringify(patch))
	const commit = () => {
		if (!patch || JSON.stringify(patch) === written.current) return
		written.current = JSON.stringify(patch)
		void state.saveInfo(patch)
	}
	return (
		// 칸을 벗어날 때(focusout은 올라온다) 바뀌었고 올바르면 쓴다.
		// biome-ignore lint/a11y/noStaticElementInteractions: 입력칸들의 focusout을 모아 받을 뿐 스스로 조작되지 않는다
		<div className="flex flex-col gap-3" onBlur={commit}>
			<Field data-invalid={!nameValid}>
				<FieldLabel htmlFor="manager-template-name">이름</FieldLabel>
				<Input
					id="manager-template-name"
					value={name}
					aria-invalid={!nameValid}
					aria-describedby="manager-template-name-error"
					onChange={(event) => setName(event.target.value)}
				/>
				<FieldError id="manager-template-name-error" className="text-xs">
					{nameValid ? null : '이름을 적어 주세요.'}
				</FieldError>
			</Field>
			<Field data-invalid={!slugValid}>
				<FieldLabel htmlFor="manager-template-slug">주소</FieldLabel>
				<Input
					id="manager-template-slug"
					value={slug}
					aria-invalid={!slugValid}
					aria-describedby="manager-template-slug-description"
					onChange={(event) => setSlug(event.target.value)}
				/>
				<FieldError className="text-xs">
					{slugValid ? null : '영문 소문자·숫자·하이픈으로 적어 주세요.'}
				</FieldError>
				<FieldDescription id="manager-template-slug-description" className="text-xs">
					영문 소문자·숫자·하이픈만 써요. 바꾸면 예전 주소로 공유한 링크가 끊겨요.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor="manager-template-description">설명</FieldLabel>
				<Textarea
					id="manager-template-description"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
				/>
			</Field>
			<FormNote error={state.error} busy={state.busy} />
		</div>
	)
}

/**
 * 선택 카드 부제의 관리 폼(`category:`) — 이 템플릿이 속할 카테고리. 카테고리 자체(이름·순서)는 모든 템플릿이
 * 같이 쓰는 파운데이션이라 admin 링크로 보낸다.
 */
export function TemplateCategoryManagerForm() {
	const { config } = useTemplateStudio()
	const state = useTemplateRecord(config.id)
	const { record } = state
	if (!record) return <FormNote error={state.error} loading />
	return (
		<div className="flex flex-col gap-3">
			<Field className="gap-1.5">
				<FieldTitle>카테고리</FieldTitle>
				<Select
					value={record.categoryId ? String(record.categoryId) : ''}
					disabled={state.busy}
					onValueChange={(value) => void state.saveInfo({ category: Number(value) })}
				>
					<SelectTrigger aria-label="카테고리" className="w-full">
						<SelectValue placeholder="카테고리를 고르세요" />
					</SelectTrigger>
					<SelectContent>
						{state.categories.map((category) => (
							<SelectItem key={category.id} value={String(category.id)}>
								{category.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<FormNote error={state.error} busy={state.busy} />
			</Field>
			<ManagerLinkForm
				note="카테고리 이름·순서는 모든 템플릿이 같이 써서 파운데이션에서 고쳐요."
				links={[
					{
						label: '파운데이션 템플릿 분류 열기',
						onOpen: () => openDataEditorTab(FOUNDATION_TABS.category),
					},
				]}
			/>
		</div>
	)
}

/**
 * 템플릿 「기본 화면」(`defaultSession`)이 무엇인지 알리고 지운다. 저장은 원본 아이콘이 한다.
 * ponytail: 선택 카드를 한 대상으로 묶으면서(사용자 2026-10-14) 지금 이 폼을 여는 자리가 없다 — 카드 패널에 넣을지 미정.
 */
export function TemplateDefaultsManagerForm() {
	const { config } = useTemplateStudio()
	const manager = useTemplateManagerData<{ defaultSession?: unknown }>(config.id, [
		'defaultSession',
	])
	const saved = manager.data?.defaultSession != null
	return (
		<div className="flex flex-col gap-3">
			<Typography size="xs" tone="muted">
				저장 아이콘을 누르면 지금 캔버스 그대로(문구·색·이미지·배경·레이어 표시)가 이
				템플릿의 기본 화면이 돼요. 모든 사용자가 이 화면으로 시작하고, 초기화해도 여기로
				돌아와요.
			</Typography>
			{manager.data === null ? (
				<FormNote error={manager.error} loading />
			) : (
				<Typography size="sm">
					{saved
						? '저장한 기본 화면이 있어요.'
						: '저장한 기본 화면이 없어요 — 템플릿 원본 그대로 시작해요.'}
				</Typography>
			)}
			<div className="flex flex-col gap-1.5">
				<Button
					size="sm"
					variant="outline"
					disabled={!saved || manager.busy}
					onClick={() =>
						void manager.save({ defaultSession: null }, '기본 화면을 지우지 못했어요.')
					}
				>
					<TrashCan aria-hidden data-icon="inline-start" />
					기본 화면 지우기
				</Button>
				<FormNote
					error={manager.error}
					busy={manager.busy}
					note="이미 작업 중인 사람은 자기 임시 저장(24시간)이 먼저 보여요."
				/>
			</div>
			<ManagerLinkForm
				note="잘못 저장한 기본 화면은 버전 기록에서 되돌려요."
				links={[{ label: '버전 기록', href: `${adminTemplateHref(config.id)}/versions` }]}
			/>
		</div>
	)
}

/**
 * 캔버스(판 전체)의 관리 폼 — 같은 Figma 프레임에서 다시 가져온다. 프레임 주소를 바꾸는 일은 admin 「가져오기」에서 한다.
 * ponytail: 캔버스는 Manager mode 대상이 아니라서(사용자 2026-10-14) 지금 이 폼을 여는 자리가 없다.
 * 어디로 옮길지는 미정(`docs/13-manager-mode.md`) — 정해지면 그 요소의 등록표 줄에 붙인다.
 */
export function TemplateCanvasManagerForm() {
	const { config } = useTemplateStudio()
	const manager = useTemplateManagerData<{ sourceUrl?: string | null }>(config.id, ['sourceUrl'])
	const [result, setResult] = useState<string | null>(null)
	const sourceUrl = manager.data?.sourceUrl ?? ''

	const reimport = () => {
		// ponytail: 브라우저 확인창 — 데이터 편집 모달의 휴지통과 같은 방식.
		if (!window.confirm('Figma에서 다시 가져올까요? 모든 사용자의 캔버스가 바로 바뀌어요.')) {
			return
		}
		setResult(null)
		void manager.save(async () => {
			const summary = await reimportTemplateFromFigma(config.id, sourceUrl)
			setResult(
				[
					`가져왔어요 — ${summary.width}×${summary.height}px.`,
					summary.resized && '가로세로 비율이 바뀌어 판형도 새 크기로 맞췄어요.',
					summary.removed > 0 &&
						`사라진 레이어의 설정 ${summary.removed}개를 정리했어요.`,
					summary.rasterized > 0 &&
						`이미지로 고정된 레이어가 ${summary.rasterized}개 있어요.`,
				]
					.filter(Boolean)
					.join(' '),
			)
		}, 'Figma에서 다시 가져오지 못했어요.')
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<Typography size="xs" tone="muted">
					Figma 프레임
				</Typography>
				<Typography size="sm" className="break-all">
					{manager.data === null
						? '불러오는 중…'
						: sourceUrl || '가져온 Figma 주소가 없어요.'}
				</Typography>
			</div>
			<div className="flex flex-col gap-1.5">
				<Button
					size="sm"
					variant="outline"
					disabled={!sourceUrl || manager.busy}
					onClick={reimport}
				>
					<Renew aria-hidden data-icon="inline-start" />
					{manager.busy ? '가져오는 중…' : 'Figma에서 다시 가져오기'}
				</Button>
				<FormNote
					error={manager.error}
					busy={manager.busy}
					note={
						result ??
						'남아 있는 레이어의 설정은 그대로 두고, 사라진 레이어의 설정은 지워요. 판형은 그대로예요 — 가로세로 비율이 바뀌었으면 디지털은 새 크기로 맞추고, 인쇄는 admin에서 가져와야 해요.'
					}
				/>
			</div>
			<ManagerLinkForm
				note="다른 프레임으로 바꾸거나 잘못 가져온 것을 되돌리려면 admin에서 해요."
				links={[
					{ label: '템플릿 admin', href: adminTemplateHref(config.id) },
					{ label: '버전 기록', href: `${adminTemplateHref(config.id)}/versions` },
				]}
			/>
		</div>
	)
}
