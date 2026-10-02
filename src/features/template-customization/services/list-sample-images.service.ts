import { listPublishedSampleImageDocuments } from '@/features/template-customization/repositories/sample-images.payload.repository'
import { type SampleImageOption, toSampleImageOption } from './list-sample-images.client'

/** 유스케이스 경계: 서버 화면(이미지 스튜디오 첫 화면의 Examples)이 그릴 발행 샘플 이미지 목록. */
export async function listPublishedSampleImages(user: unknown): Promise<SampleImageOption[]> {
	const documents = await listPublishedSampleImageDocuments(user)
	return documents.flatMap(toSampleImageOption)
}
