'use client'

import { Renew, TrashCan } from '@carbon/icons-react'
import { useState } from 'react'
import { ManagerLinkForm } from '@/components/studio/template/manager-forms/link-form'
import { reimportTemplateFromFigma } from '@/components/studio/template/manager-forms/template-html-writes'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
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

function RecordLoading({ error }: { error: string | null }) {
	return (
		<Typography
			size="xs"
			tone={error ? 'destructive' : 'muted'}
			role={error ? 'alert' : undefined}
		>
			{error ?? '불러오는 중…'}
		</Typography>
	)
}

/**
 * 선택 카드 제목의 관리 폼(`name:`) — 템플릿 이름·주소·설명. 지금 보는 템플릿의 주소를 바꾸면
 * 새 주소로 옮겨 간다(`useTemplateRecord`).
 */
export function TemplateNameManagerForm() {
	const { config } = useTemplateStudio()
	const state = useTemplateRecord(config.id)
	if (!state.record) return <RecordLoading error={state.error} />
	// 저장하면 다시 읽은 값으로 새로 시작한다.
	return <NameFormBody key={state.record.updatedAt} record={state.record} state={state} />
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
	return (
		<div className="flex flex-col gap-3">
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
				<FieldDescription id="manager-template-slug-description">
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
			<Button
				size="sm"
				disabled={!patch || state.busy}
				onClick={() => patch && void state.saveInfo(patch)}
			>
				저장
			</Button>
			<FormNote
				error={state.error}
				busy={state.busy}
				note="저장하면 모든 사용자에게 바로 반영돼요."
			/>
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
	if (!record) return <RecordLoading error={state.error} />
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1.5">
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
				<FormNote
					error={state.error}
					busy={state.busy}
					note="고르면 모든 사용자에게 바로 반영돼요."
				/>
			</div>
			<ManagerLinkForm
				note="카테고리 이름·순서는 모든 템플릿이 같이 써서 admin에서 고쳐요."
				links={[
					...(record.categoryId
						? [
								{
									label: '이 카테고리',
									href: `/admin/collections/template-categories/${record.categoryId}`,
								},
							]
						: []),
					{ label: '카테고리 목록', href: '/admin/collections/template-categories' },
				]}
			/>
		</div>
	)
}

/**
 * 선택 카드 저장 아이콘의 관리 폼(`defaults:`) — 템플릿 「기본 화면」(`defaultSession`)이 무엇인지 알리고 지운다.
 * 저장은 원본 아이콘이 한다.
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
			<Typography size="sm">
				{manager.data === null
					? '불러오는 중…'
					: saved
						? '저장한 기본 화면이 있어요.'
						: '저장한 기본 화면이 없어요 — 템플릿 원본 그대로 시작해요.'}
			</Typography>
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
 * 캔버스(판 전체)의 관리 폼(`canvas:`) — 같은 Figma 프레임에서 다시 가져와 바로 반영한다. 프레임 주소를
 * 바꾸는 일은 admin 「가져오기」에서 한다.
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
