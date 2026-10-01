'use client'

import { Close } from '@carbon/icons-react'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { IMAGE_REFERENCE_UPLOAD_MIME_TYPES } from '@/features/image-generation/domain/reference-image/contract'
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

	return (
		<div className={cn('flex flex-col gap-1.5', !compact && 'pb-2.5')}>
			<div
				className={cn(
					'relative grid w-full place-items-center rounded-lg bg-muted',
					compact ? 'h-53' : 'aspect-square',
				)}
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
			</div>
			{error && <FieldError>{error}</FieldError>}
		</div>
	)
}
