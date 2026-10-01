import { notFound } from 'next/navigation'
import { StudioPanelPlayground } from '@/components/studio/playground/studio-panel-playground'

export default function StudioPlaygroundPage() {
	if (process.env.NODE_ENV !== 'development') notFound()
	return <StudioPanelPlayground />
}
