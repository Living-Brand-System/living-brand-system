import { Add } from '@carbon/icons-react'
import { getTranslation } from '@payloadcms/translations'
import Link from 'next/link'
import type { AdminViewServerProps } from 'payload'
import { PageHero } from '@/components/shared/page-hero'
import { PanelCard, PanelChip } from '@/components/shared/panel-card'
import { cn } from '@/lib/utils'
import {
	DASHBOARD_CARD_BLOCKS,
	DASHBOARD_PLAIN_BLOCKS,
	DASHBOARD_SYSTEM_BLOCK,
	type DashboardBlock,
	type DashboardEntry,
} from './dashboard-blocks'

/** 🔴 모듈 상수여야 한다 — 렌더마다 새 객체면 히어로 shader가 계속 다시 마운트된다. */
const ADMIN_HERO_VALUES = { shape: 'radial' } as const

/** 링크 하나를 그리는 데 필요한 것 — 라벨과 목적지. 만들 수 없는 자원은 `createHref`가 없다. */
type ResolvedEntry = {
	href: string
	label: string
	createHref?: string
}

/** 권한과 config를 통과한 뒤의 블록. 원본과 달리 slug가 아니라 그릴 것만 남는다. */
type ResolvedBlock = {
	entries: ResolvedEntry[]
	title: string
	wide?: boolean
}

/**
 * Payload 기본 대시보드를 대신한다. 기본 화면은 사이드바의 `admin.group`을 그대로 카드로 펴는데,
 * 디자인은 그와 다른 묶음을 요구한다(`dashboard-blocks.ts`).
 *
 * 라벨은 config가, 무엇을 보일지는 권한이 정한다 — 읽을 수 없는 자원은 줄 자체를 그리지 않는다.
 */
export async function AdminDashboard({ initPageResult }: AdminViewServerProps) {
	const { permissions, req } = initPageResult
	const { config } = req.payload
	const adminRoute = config.routes.admin

	function resolve(entry: DashboardEntry): null | ResolvedEntry {
		if (entry.kind === 'global') {
			const global = config.globals.find((candidate) => candidate.slug === entry.slug)
			if (!global || !permissions.globals?.[entry.slug]?.read) return null
			return {
				href: `${adminRoute}/globals/${entry.slug}`,
				label: getTranslation(global.label ?? entry.slug, req.i18n),
			}
		}

		const collection = config.collections.find((candidate) => candidate.slug === entry.slug)
		if (!collection || !permissions.collections?.[entry.slug]?.read) return null
		return {
			createHref: permissions.collections[entry.slug]?.create
				? `${adminRoute}/collections/${entry.slug}/create`
				: undefined,
			href: `${adminRoute}/collections/${entry.slug}`,
			label: getTranslation(collection.labels?.plural ?? entry.slug, req.i18n),
		}
	}

	function resolveBlock(block: DashboardBlock): null | ResolvedBlock {
		const entries = block.entries.map(resolve).filter((entry) => entry !== null)
		return entries.length > 0 ? { entries, title: block.title, wide: block.wide } : null
	}

	const cardBlocks = DASHBOARD_CARD_BLOCKS.map(resolveBlock).filter((block) => block !== null)
	const plainBlocks = DASHBOARD_PLAIN_BLOCKS.map(resolveBlock).filter((block) => block !== null)
	const systemBlock = resolveBlock(DASHBOARD_SYSTEM_BLOCK)

	return (
		<div className="flex flex-col gap-[12px] px-[60px] py-[12px]">
			{/* shader 값은 런타임 기본값을 그대로 쓴다. 어드민에서 튜닝하려면 graphic-profiles로 잇는 별도 작업이 필요하다. */}
			<PageHero
				className="aspect-[1412/381] w-full"
				fallbackSrc="/images/hero_admin.png"
				runtimeId="fluted-glass"
				values={ADMIN_HERO_VALUES}
			>
				{/* biome-ignore lint/performance/noImgElement: Payload admin은 next/image의 최적화 경로를 타지 않는다. */}
				<img alt="HD" className="w-[11%] min-w-[96px]" src="/logos/logo_wht.svg" />
			</PageHero>

			<div className="grid grid-cols-1 gap-[12px] md:grid-cols-2">
				{cardBlocks.map((block) => (
					<CardBlock block={block} key={block.title} />
				))}
			</div>

			{/* 카드에서 시선을 떼어 놓는 자리. 위 여백이 넓은 것이 이 제목의 일이다. */}
			<h2 className="px-[12px] pt-[80px] pb-[12px] font-medium text-[26px] text-brand-deep leading-[32px]">
				기타 설정
			</h2>

			<div className="grid grid-cols-1 gap-[12px] md:grid-cols-3">
				{plainBlocks.map((block) => (
					<PlainBlock block={block} key={block.title} />
				))}
			</div>

			{systemBlock ? <PlainBlock block={systemBlock} /> : null}
		</div>
	)
}

function CardBlock({ block }: { block: ResolvedBlock }) {
	return (
		<PanelCard
			className={cn(
				'min-h-[381px] bg-brand-tint/10 text-brand-deep ring-brand/20',
				block.wide && 'md:col-span-2',
			)}
			title={block.title}
		>
			<ul className="m-0 flex list-none flex-col items-start gap-[6px] p-0">
				{block.entries.map((entry) => (
					<li key={entry.href}>
						<PanelChip
							className="gap-[16px] border-brand-tint/10 bg-background/60 py-[16px] pr-[10px] pl-[16px] data-[bare=true]:pr-[16px]"
							data-bare={!entry.createHref}
						>
							<Link
								className="font-semibold text-[13px] text-brand-deep leading-[16px] no-underline"
								href={entry.href}
							>
								{entry.label}
							</Link>
							{entry.createHref ? <CreateLink entry={entry} tone="brand" /> : null}
						</PanelChip>
					</li>
				))}
			</ul>
		</PanelCard>
	)
}

function PlainBlock({ block }: { block: ResolvedBlock }) {
	return (
		<section
			className="flex flex-col gap-[16px] border-border border-t p-[16px]"
			data-slot="admin-dashboard-list"
		>
			<h3 className="font-medium text-[20px] text-foreground leading-[32px]">
				{block.title}
			</h3>
			<ul className="m-0 flex list-none flex-col items-start gap-[6px] p-0">
				{block.entries.map((entry) => (
					<li className="flex items-center gap-[8px]" key={entry.href}>
						<Link
							className="font-semibold text-[13px] text-muted-foreground leading-[16px] no-underline"
							href={entry.href}
						>
							{entry.label}
						</Link>
						{entry.createHref ? <CreateLink entry={entry} tone="plain" /> : null}
					</li>
				))}
			</ul>
		</section>
	)
}

function CreateLink({ entry, tone }: { entry: ResolvedEntry; tone: 'brand' | 'plain' }) {
	if (!entry.createHref) return null
	return (
		<Link
			aria-label={`${entry.label} 새로 만들기`}
			className={cn(
				'flex size-[22px] items-center justify-center rounded-full border',
				tone === 'brand'
					? 'border-brand-tint/10 text-brand-deep'
					: 'border-border text-muted-foreground',
			)}
			href={entry.createHref}
		>
			<Add size={20} />
		</Link>
	)
}
