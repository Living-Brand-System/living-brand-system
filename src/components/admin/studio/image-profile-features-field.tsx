'use client'

import { FieldDescription, useForm, useFormFields } from '@payloadcms/ui'
import { getDataByPath } from 'payload/shared'
import { AdminSectionHeading } from '@/components/admin/shared/admin-section-heading'
import { Controller } from '@/components/shared/controller'

const ON_OFF = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

type FeatureRow = {
	blockType: string
	background?: boolean
	azimuths?: readonly string[]
	elevations?: readonly string[]
}

type SectorOptions = readonly { label: string; value: string }[]

/**
 * 프로파일 기능(blocks)을 정본 문법의 토글로 그린다 — 저장 계약은 blocks 그대로 두고
 * On = 블록 추가(addFieldRow), Off = 블록 제거(removeFieldRow)로만 옮긴다.
 * 기능별 세부값(배경 색상 조정·카메라 허용 구간)은 켜져 있을 때만 아래 행으로 편다.
 */
export function ImageProfileFeaturesField({
	path,
	schemaPath,
	azimuthOptions,
	elevationOptions,
}: {
	path: string
	schemaPath: string
	azimuthOptions: SectorOptions
	elevationOptions: SectorOptions
}) {
	const { addFieldRow, disabled, dispatchFields, removeFieldRow, setModified } = useForm()
	const features = useFormFields(([fields]) => getDataByPath<FeatureRow[]>(fields, path)) ?? []

	const indexOf = (blockType: string) =>
		features.findIndex((feature) => feature?.blockType === blockType)

	function setEnabled(blockType: string, enabled: boolean) {
		const index = indexOf(blockType)
		if (enabled && index === -1) addFieldRow({ blockType, path, schemaPath })
		if (!enabled && index !== -1) removeFieldRow({ path, rowIndex: index })
		setModified(true)
	}

	function updateSubfield(blockType: string, name: string, value: unknown) {
		const index = indexOf(blockType)
		if (index === -1) return
		dispatchFields({ type: 'UPDATE', path: `${path}.${index}.${name}`, value })
		setModified(true)
	}

	function featureToggle(blockType: string, label: string) {
		return (
			<Controller.Segmented
				aria-label={`${label} 사용`}
				options={ON_OFF}
				disabled={disabled}
				value={indexOf(blockType) === -1 ? 'off' : 'on'}
				onChange={(next) => setEnabled(blockType, next === 'on')}
			/>
		)
	}

	/** 허용 구간 칩 — 전부 켜면 값을 비운다("비우면 전부 허용"이 계약의 기본값). */
	function sectorChips(blockType: string, name: string, label: string, options: SectorOptions) {
		const stored = features[indexOf(blockType)]?.[name as 'azimuths' | 'elevations']
		const all = options.map(({ value }) => value)
		const selected = Array.isArray(stored) ? all.filter((value) => stored.includes(value)) : all
		return (
			<Controller.Row label={label} disabled={disabled}>
				<Controller.Chips
					aria-label={label}
					options={options}
					value={selected}
					onChange={(next) => {
						const allowed = all.filter((candidate) => next.includes(candidate))
						updateSubfield(
							blockType,
							name,
							allowed.length === all.length ? undefined : allowed,
						)
					}}
				/>
			</Controller.Row>
		)
	}

	const colorOn = indexOf('colorAdjustment') !== -1
	const cameraOn = indexOf('cameraControl') !== -1
	const background = features[indexOf('colorAdjustment')]?.background === true

	return (
		<div className="lbs-kit field-type json mb-20">
			<AdminSectionHeading>프로파일 기능</AdminSectionHeading>
			<div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
				<Controller.Group
					title="색 조정"
					collapsible={false}
					trailing={featureToggle('colorAdjustment', '색 조정')}
				>
					{colorOn && (
						<Controller.Row label="배경 색상 조정" disabled={disabled}>
							<Controller.Segmented
								aria-label="배경 색상 조정"
								options={ON_OFF}
								value={background ? 'on' : 'off'}
								onChange={(next) =>
									updateSubfield('colorAdjustment', 'background', next === 'on')
								}
							/>
						</Controller.Row>
					)}
				</Controller.Group>
				<Controller.Group
					title="참조 이미지 첨부"
					collapsible={false}
					trailing={featureToggle('referenceImage', '참조 이미지 첨부')}
				/>
				<Controller.Group
					title="카메라 조정"
					collapsible={false}
					trailing={featureToggle('cameraControl', '카메라 조정')}
				>
					{cameraOn && (
						<>
							{sectorChips('cameraControl', 'azimuths', '허용 방향', azimuthOptions)}
							{sectorChips(
								'cameraControl',
								'elevations',
								'허용 높이',
								elevationOptions,
							)}
						</>
					)}
				</Controller.Group>
			</div>
			<FieldDescription
				description="끄면 기능을 열지 않습니다. 값과 사용 상태는 컨트롤러 제한이 소유합니다."
				path={path}
			/>
		</div>
	)
}
