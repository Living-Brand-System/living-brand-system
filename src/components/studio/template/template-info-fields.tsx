'use client'

import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { TemplateCategoryOption } from '@/features/template-customization/services/template-records.client'

/** Payload 템플릿 폼의 기본 정보 칸(이름·주소·설명·카테고리·판형)을 앱 입력으로 — 생성과 수정이 같이 쓴다. */
export type TemplateFormValues = {
	name: string
	slug: string
	description: string
	category: number | null
	outputKind: 'digital' | 'print'
	/** 입력 중인 글자 그대로 — 숫자 변환은 저장할 때 한다. */
	sizeWidth: string
	sizeHeight: string
}

export const EMPTY_TEMPLATE_FORM: TemplateFormValues = {
	name: '',
	slug: '',
	description: '',
	category: null,
	outputKind: 'digital',
	sizeWidth: '',
	sizeHeight: '',
}

/** 판형 크기 칸의 값 — 둘 다 1 이상이어야 숫자로 돌려준다. 비율·정수 검증은 서버(`validateTemplateSize`)가 한다. */
export function parseTemplateSize(values: TemplateFormValues) {
	const size = { width: Number(values.sizeWidth), height: Number(values.sizeHeight) }
	return size.width > 0 && size.height > 0 ? size : null
}

type TemplateInfoFieldsProps = {
	/** 같은 화면에 폼이 둘 뜰 일은 없지만 label 연결(id)이 겹치지 않게 접두를 받는다. */
	idPrefix: string
	values: TemplateFormValues
	onChange: (patch: Partial<TemplateFormValues>) => void
	categories: readonly TemplateCategoryOption[]
	/** Figma 판 크기(px) — 판형 비율의 기준. */
	figmaSize: { width: number | null; height: number | null }
	/** 새로 만들 땐 디지털 크기를 비워 두면 서버가 Figma 판 px로 채운다 — 그때는 칸을 숨긴다. */
	hideDigitalSize?: boolean
}

export function TemplateInfoFields({
	idPrefix,
	values,
	onChange,
	categories,
	figmaSize,
	hideDigitalSize = false,
}: TemplateInfoFieldsProps) {
	const unit = values.outputKind === 'print' ? 'mm' : 'px'
	const showSize = values.outputKind === 'print' || !hideDigitalSize
	return (
		<>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-name`}>이름</FieldLabel>
				<Input
					id={`${idPrefix}-name`}
					value={values.name}
					onChange={(event) => onChange({ name: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-slug`}>주소</FieldLabel>
				<Input
					id={`${idPrefix}-slug`}
					placeholder="poster-a3"
					value={values.slug}
					onChange={(event) => onChange({ slug: event.target.value })}
				/>
				<FieldDescription>
					영문 소문자·숫자·하이픈만 써요. 비우면 이름으로 만들고, 이름이 한글뿐이면 직접
					적어 주세요.
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-description`}>설명</FieldLabel>
				<Textarea
					id={`${idPrefix}-description`}
					value={values.description}
					onChange={(event) => onChange({ description: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={`${idPrefix}-category`}>카테고리</FieldLabel>
				<Select
					value={values.category ? String(values.category) : ''}
					onValueChange={(value) => onChange({ category: Number(value) })}
				>
					<SelectTrigger id={`${idPrefix}-category`}>
						<SelectValue placeholder="카테고리를 고르세요" />
					</SelectTrigger>
					<SelectContent>
						{categories.map((category) => (
							<SelectItem key={category.id} value={String(category.id)}>
								{category.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<FieldDescription>템플릿 첫 화면에서 이 템플릿이 속할 묶음이에요.</FieldDescription>
			</Field>
			<Field>
				<FieldLabel>판형</FieldLabel>
				<ToggleGroup
					type="single"
					variant="outline"
					spacing={0}
					value={values.outputKind}
					onValueChange={(value) =>
						value && onChange({ outputKind: value as TemplateFormValues['outputKind'] })
					}
					aria-label="판형 종류"
				>
					<ToggleGroupItem value="digital">디지털 (px · PNG·JPG·MP4)</ToggleGroupItem>
					<ToggleGroupItem value="print">인쇄 (mm · PDF·TIFF·SVG)</ToggleGroupItem>
				</ToggleGroup>
				{showSize && (
					<div className="flex items-center gap-2">
						<Input
							aria-label={`가로 ${unit}`}
							inputMode="numeric"
							placeholder={`가로 ${unit}`}
							value={values.sizeWidth}
							onChange={(event) => onChange({ sizeWidth: event.target.value })}
						/>
						<span aria-hidden>×</span>
						<Input
							aria-label={`세로 ${unit}`}
							inputMode="numeric"
							placeholder={`세로 ${unit}`}
							value={values.sizeHeight}
							onChange={(event) => onChange({ sizeHeight: event.target.value })}
						/>
					</div>
				)}
				<FieldDescription>
					{showSize
						? `Figma 판(${figmaSize.width}×${figmaSize.height}px)과 가로세로 비율이 같아야 해요.`
						: `Figma 판 크기(${figmaSize.width}×${figmaSize.height}px)를 그대로 써요.`}
				</FieldDescription>
			</Field>
		</>
	)
}
