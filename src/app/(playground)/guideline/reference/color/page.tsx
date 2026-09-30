import { ColorReference } from '@/components/guideline/reference/color'
import { getGuidelinePalette } from '@/features/guideline/services/get-guideline-colors.service'

export default async function ColorPage() {
	return <ColorReference catalog={await getGuidelinePalette()} />
}
