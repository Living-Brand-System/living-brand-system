import { ReferencePlayground, ReferencePreview } from '@/components/guideline/reference/playground'

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }
export default async function ReferencePlaygroundPage({ searchParams }: PageProps) {
	const params = await searchParams
	return params.preview === '1' ? <ReferencePreview params={params} /> : <ReferencePlayground />
}
