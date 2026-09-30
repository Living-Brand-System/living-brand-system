'use client'

import { useCallback, useState } from 'react'
import {
	type StudioPreviewKind,
	updateProfilePreview,
} from '@/features/studio-preview/services/update-profile-preview.client'
import type {
	RasterArtifact,
	StudioArtifactProducer,
} from '@/modules/studio-artifact/studio-artifact'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'
import { useStudioCapabilities } from './studio-capabilities'

/**
 * 「현재 화면을 이 프로파일의 미리보기로」의 상태 기계 — 세 스튜디오가 공유한다.
 *
 * 🔴 `features/`가 아니라 여기 사는 이유: 권한 컨텍스트(`useStudioCapabilities`)를 읽는데
 * features는 components를 import할 수 없다(`tests/int/layer-boundaries.int.spec.ts`).
 * 순수 계산·I/O는 `features/studio-preview/services/`가 갖는다.
 *
 * 🔑 화면에 붙일 조건이 세 가지다: 권한이 있고(매니저), 그릴 Raster Artifact가 있고, 크기를 안다.
 * 하나라도 없으면 `canRefresh`가 false이고 소비자는 버튼 자체를 두지 않는다.
 */
export function useProfilePreview({
	studio,
	profileId,
	artifact,
	viewport,
	onUpdated,
}: {
	studio: StudioPreviewKind
	profileId: string | number
	/** 이미 만들어진 Artifact이거나, 요청 시 만드는 생산자(템플릿이 그렇다). */
	artifact: RasterArtifact | StudioArtifactProducer<RasterArtifact> | null | undefined
	viewport: { width: number; height: number } | null | undefined
	/** 갱신에 성공한 뒤 호출된다 — 교체 후보 목록이 옛 썸네일을 들고 있으므로 다시 가져오게 한다. */
	onUpdated?: () => void
}) {
	const { canManageProfiles } = useStudioCapabilities()
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	// 갱신 직후 카드가 새 그림을 바로 보여준다 — 서버 config는 다음 요청에나 새로 온다.
	const [image, setImage] = useState<StudioPreviewImage | undefined>(undefined)

	const ready = Boolean(artifact && viewport)
	const refresh = useCallback(() => {
		if (!artifact || !viewport || refreshing) return
		setRefreshing(true)
		setError(null)
		// 🔴 producer 호출을 체인 **안**에서 한다. `Promise.resolve(artifact())`는 인자를 먼저
		//    평가하므로 동기 throw가 체인을 우회해 밖으로 새고, 그러면 `catch`가 못 잡아
		//    스피너가 영구히 돌고 문구도 안 뜬다(재현으로 확인).
		void Promise.resolve()
			.then(() => (typeof artifact === 'function' ? artifact() : artifact))
			.then((resolved) =>
				updateProfilePreview({ studio, profileId, artifact: resolved, viewport }),
			)
			.then((next) => {
				setImage(next)
				// 카드만 고치면 「Change」 목록의 썸네일이 옛 그림으로 남는다.
				onUpdated?.()
			})
			.catch((cause: unknown) =>
				setError(
					cause instanceof Error ? cause.message : '미리보기를 갱신하지 못했습니다.',
				),
			)
			.finally(() => setRefreshing(false))
	}, [artifact, onUpdated, profileId, refreshing, studio, viewport])

	return {
		canRefresh: canManageProfiles && ready,
		refreshing,
		error,
		image,
		refresh,
	}
}
