'use client'

import { RefreshRouteOnSave as PayloadRefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function RefreshRouteOnSave() {
	const router = useRouter()
	const [serverURL, setServerURL] = useState('')

	useEffect(() => setServerURL(window.location.origin), [])

	if (!serverURL) return null

	return <PayloadRefreshRouteOnSave refresh={router.refresh} serverURL={serverURL} />
}
