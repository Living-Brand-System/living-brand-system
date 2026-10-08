'use client'

import { Close } from '@carbon/icons-react'
import { type ClipboardEvent, type DragEvent, useId } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { IMAGE_REFERENCE_UPLOAD_MIME_TYPES } from '@/features/image-generation/domain/reference-image/contract'
import { readDroppedImageFile } from '@/features/image-generation/services/read-dropped-image.client'
import { useFileInput } from '@/hooks/use-file-input'
import { cn } from '@/lib/utils'

type ImageReferenceUploadProps = {
	/** 첨부된 이미지의 data URI — 없으면 빈 판만 그린다. */
	value: string | null
	name: string | null
	error: string | null
	disabled: boolean
	onAttach: (file: File) => void
	onClear: () => void
	/** Compound 본문에 들어가는 212px 업로드 영역. */
	compact?: boolean
	onPreviewError?: () => void
}

/**
 * 참조 이미지 첨부 — 첨부는 저장하지 않는 1회용이라 여기 있는 값이 곧 다음 생성의 시드다.
 * 파일 읽기·검증·세션 보관은 ImageStudioProvider가 소유하고 여기는 표현과 파일 선택만 한다.
 * 디자인 SSOT: Figma HD_LBS_UI 112:2 "Image Upload".
 *
 * 파일을 받는 길은 셋이다 — 버튼·끌어다 놓기·붙여넣기. 검증(형식·10MB)은 세 길 모두
 * `onAttach` 뒤에서 한 번만 한다.
 * 🔑 끌어다 놓기는 바탕화면 파일과 **앱 안의 이미지**를 둘 다 받는다 — 앱 안의 것은 파일이 아니라
 *    주소로 오므로 `readDroppedImageFile`이 같은 File로 바꿔 준다.
 * 🔴 붙여넣기는 **이 판에 포커스가 있을 때만** 받는다(그래서 `tabIndex`가 있다). window에 붙이면
 *    한 화면에 첨부 판이 둘 이상 뜰 때 모두가 같은 이미지를 집어삼킨다.
 *    **이 제약이 맞다고 사용자가 확인했다(2026-09-29)** — 「클릭 없이 바로 ⌘V」로 바꾸지 말 것.
 */
export function ImageReferenceUpload({
	value,
	name,
	error,
	disabled,
	onAttach,
	onClear,
	compact = false,
	onPreviewError,
}: ImageReferenceUploadProps) {
	const fileInput = useFileInput()
	const errorId = useId()
	const describedBy = error ? errorId : undefined
	const attachFirst = (files: FileList) => {
		const file = files[0]
		if (file) onAttach(file)
	}

	return (
		<div className={cn('flex flex-col gap-1.5', !compact && 'pb-2.5')}>
			{/* 🔴 `disabled`를 fieldset에 주지 않는다 — 주면 안의 제거 버튼까지 같이 죽는다. */}
			<fieldset
				className={cn(
					'relative grid w-full min-w-0 place-items-center rounded-lg bg-muted',
					compact ? 'h-53' : 'aspect-square',
				)}
				// 끌어다 놓기·붙여넣기를 받는 자리라 포커스를 받는다 — 이름이 없으면 무엇에
				// 붙여넣는지 스크린리더가 말할 수 없다. 드롭 대상을 가리키는 role은 ARIA에 없어,
				// 이 판이 담은 것(미리보기·버튼)을 묶는 fieldset으로 이름을 붙인다.
				tabIndex={disabled ? -1 : 0}
				aria-label="참조 이미지 놓는 자리 — 파일을 끌어다 놓거나 붙여넣을 수 있어요"
				onDragOver={(event: DragEvent<HTMLElement>) => {
					// 앱 안의 이미지는 'Files'가 아니라 주소로 실려 온다.
					if (disabled || !canDropImage(event.dataTransfer)) return
					event.preventDefault()
					event.dataTransfer.dropEffect = 'copy'
				}}
				onDrop={(event: DragEvent<HTMLElement>) => {
					if (disabled) return
					event.preventDefault()
					void readDroppedImageFile(event.dataTransfer).then((file) => {
						if (file) onAttach(file)
					})
				}}
				onPaste={(event: ClipboardEvent<HTMLElement>) => {
					if (disabled || event.clipboardData.files.length === 0) return
					event.preventDefault()
					attachFirst(event.clipboardData.files)
				}}
			>
				<div
					className={cn(
						'grid place-items-center overflow-hidden bg-card',
						compact ? 'size-[147px]' : 'size-[70%]',
					)}
				>
					{value && (
						// biome-ignore lint/performance/noImgElement: 첨부 미리보기, 최적화 불필요
						<img
							src={value}
							onError={onPreviewError}
							alt={name ? `첨부한 참조 이미지: ${name}` : '첨부한 참조 이미지'}
							className="size-full object-contain"
						/>
					)}
				</div>
				<Button
					type="button"
					variant="muted"
					shape="pill"
					className={cn(
						'absolute',
						compact && 'h-8 rounded-xl bg-foreground/15 px-2 text-sm',
					)}
					disabled={disabled}
					aria-describedby={describedBy}
					onClick={fileInput.open}
				>
					{value ? '이미지 변경' : 'Upload Image'}
				</Button>
				{(value || error) && (
					<Button
						type="button"
						aria-label="첨부 이미지 제거"
						variant="ghost"
						size="icon-sm"
						className="absolute top-1.5 right-1.5"
						disabled={disabled}
						onClick={() => {
							onClear()
							fileInput.reset()
						}}
					>
						<Close aria-hidden />
					</Button>
				)}
				<input
					ref={fileInput.ref}
					type="file"
					aria-label="참조 이미지 파일"
					aria-describedby={describedBy}
					disabled={disabled}
					className="sr-only"
					accept={IMAGE_REFERENCE_UPLOAD_MIME_TYPES.join(',')}
					onChange={(event) => {
						const file = event.currentTarget.files?.[0]
						if (file) onAttach(file)
						// 같은 파일을 다시 고를 수 있어야 한다 — 거절된 파일을 고쳐 다시 올리는 경로다.
						fileInput.reset()
					}}
				/>
			</fieldset>
			{error && <FieldError id={errorId}>{error}</FieldError>}
		</div>
	)
}

/** 파일이거나 주소면 받는다 — 글자만 끌어온 것은 무시해 커서가 거짓말하지 않게 한다. */
function canDropImage(dataTransfer: DataTransfer) {
	return ['Files', 'text/uri-list'].some((type) => dataTransfer.types.includes(type))
}
