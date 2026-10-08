'use client'

import { Close } from '@carbon/icons-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import type { StudioPreviewImage } from '@/modules/studio-controller/controller-definition'

/** 패널이 뜰 좌표계이자 포털 목적지 — Root가 자기 DOM 노드를 내려주고 Panel이 그리로 옮겨 붙는다. */
const BrowserFrameContext = React.createContext<HTMLElement | null>(null)

type ControllerBrowserRootProps = {
	className?: string
	children: React.ReactNode
}

/**
 * 자산 브라우저 컴파운드의 뿌리 — 패널이 뜰 위치 기준(프레임)을 소유한다.
 * 여러 자산 카드가 이 하나의 프레임을 공유하고, 열림 상태는 카드마다 Item이 따로 갖는다.
 */
function ControllerBrowserRoot({ className, children }: ControllerBrowserRootProps) {
	const [frame, setFrame] = React.useState<HTMLDivElement | null>(null)

	return (
		<div
			ref={setFrame}
			data-slot="controller-browser"
			className={cn('relative h-full', className)}
		>
			<BrowserFrameContext.Provider value={frame}>{children}</BrowserFrameContext.Provider>
		</div>
	)
}

/**
 * 자산 하나의 열림 상태 — 트리거·패널 한 짝을 감싼다.
 *
 * 열림은 radix가 소유하는 비제어 상태다. 소비자는 useState를 들지 않고, 트리거·닫기·Esc가
 * 그 상태를 움직인다. ui/dialog의 DialogContent는 스크림(DialogOverlay)과 화면 중앙 고정을
 * 함께 소유해서 쓸 수 없어 radix Dialog를 modal={false}로 직접 감싼다 — 스크림 없이 캔버스가
 * 계속 보이고 조작되면서도 Esc 닫기·role="dialog"·닫은 뒤 트리거로 포커스 복귀는 radix가 갖는다.
 *
 * 🔴 카드마다 하나여야 한다 — radix Dialog는 Root마다 triggerRef를 하나만 들어서, 한 Dialog에
 * 트리거가 둘 이상 붙으면 서로 덮어쓴다. 그러면 누른 트리거가 "패널 밖"으로 판정돼(포커스가
 * 트리거로 들어오는 순간 dismiss) 패널이 열렸다가 곧바로 닫힌다.
 *
 * Trigger·Panel은 이 Item의 Dialog 컨텍스트가 없으면 렌더에서 죽는다 — 짝이 구조로 강제된다.
 */
function ControllerBrowserItem({ children }: { children: React.ReactNode }) {
	return <DialogPrimitive.Root modal={false}>{children}</DialogPrimitive.Root>
}

/** 패널을 여는 버튼 자리 — 자산 브라우저 안에만 존재한다(무엇을 여는지가 계약으로 남는다). */
function ControllerBrowserTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="controller-browser-trigger" {...props} />
}

/** 고르면 닫히는 자리 — 패널 본문의 선택 버튼이 asChild로 감싸 쓴다(닫기는 radix가 소유). */
function ControllerBrowserClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="controller-browser-close" {...props} />
}

/**
 * 카드 위쪽의 미리보기 자리 — 이미지가 없으면 지금의 빈 표면을 그대로 유지한다.
 * alt는 어드민이 등록한 설명을 그대로 쓴다: 미리보기는 카드 이름이 말해주지 않는 것(무엇처럼 생겼나)을
 * 전하므로 장식이 아니다.
 */
function ControllerBrowserThumbnail({
	image,
	className,
}: {
	image?: StudioPreviewImage
	className?: string
}) {
	return (
		<div
			data-slot="controller-browser-thumbnail"
			className={cn('min-h-0 flex-1 overflow-hidden bg-background/20', className)}
		>
			{image && (
				// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
				<img src={image.url} alt={image.alt} className="size-full object-cover" />
			)}
		</div>
	)
}

type ControllerBrowserPanelProps = {
	/** 탭 라벨 — 지금은 하나(Image Profiles)다. 전체가 패널의 접근 이름을 겸한다. */
	tabs: readonly string[]
	/** 본문이 비었을 때 그리드 아래 자리에 앉는 안내. */
	empty?: React.ReactNode
	/**
	 * 프레임의 어느 쪽으로 떠오르나. 🔴 **캔버스 쪽으로** 떠야 한다 — 화면 밖으로 나가면
	 * 패널이 열려도 아무것도 안 보인다(왼쪽 패널의 카드에서 실제로 그랬다).
	 * 오른쪽 사이드바의 카드는 `'left'`(기본), 왼쪽 패널의 카드는 `'right'`다.
	 */
	side?: 'left' | 'right'
	className?: string
	children: React.ReactNode
}

/**
 * 컨트롤러 옆에 떠서 캔버스를 덮는 글래스 패널 — 도메인 무지: 무엇을 고르는 브라우저인지 모른다.
 * 소유하는 것은 글래스 크롬, 헤더(탭 + 닫기), 본문 영역, 빈 상태 자리뿐이다.
 *
 * 색: 테마와 무관하게 어두운 글래스를 의도한 디자인이지만 생 rgba를 쓰지 않는다(docs/09 §4).
 * `inverted` 표면 쌍으로 내부 겹침을 쌓는다 — 다크 테마에서는 쌍이 함께 뒤집혀 밝은 글래스가 된다.
 */
function ControllerBrowserPanel({
	tabs,
	empty,
	side = 'left',
	className,
	children,
}: ControllerBrowserPanelProps) {
	const frame = React.useContext(BrowserFrameContext)

	const content = (
		<DialogPrimitive.Content
			data-slot="controller-browser-panel"
			// 설명 문단이 없다 — 비워두지 않으면 radix가 존재하지 않는 id를 가리킨다.
			aria-describedby={undefined}
			className={cn(
				// 상한은 top-5만큼 줄인 남은 높이다 — 100%로 두면 컨트롤러 아래로 20px 넘친다.
				'absolute top-5 z-20 flex h-168 max-h-[calc(100%-1.25rem)] w-150 max-w-[calc(100vw-2rem)] flex-col gap-1 overflow-hidden rounded-xl border border-inverted-foreground/5 bg-inverted/75 p-2 text-inverted-foreground shadow-lg outline-none backdrop-blur-sm',
				// 트리거가 있는 쪽에서 밀려 나온다 — 어디서 열렸는지가 방향으로 남는다.
				'duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none',
				side === 'left'
					? 'right-0 data-open:slide-in-from-right-4 data-closed:slide-out-to-right-4 lg:right-full lg:mr-4'
					: 'left-0 data-open:slide-in-from-left-4 data-closed:slide-out-to-left-4 lg:left-full lg:ml-4',
				className,
			)}
		>
			<div className="flex shrink-0 items-center justify-end gap-3 py-1 pr-2">
				<DialogPrimitive.Title className="flex h-8 min-w-0 flex-1 items-center overflow-hidden">
					{tabs.map((tab) => (
						<Typography
							key={tab}
							as="span"
							size="base"
							weight="medium"
							className="flex h-8 items-center justify-center rounded-lg px-3"
						>
							{tab}
						</Typography>
					))}
				</DialogPrimitive.Title>
				<ControllerBrowserClose asChild>
					<Button
						variant="ghost"
						size="icon"
						shape="pill"
						className="bg-inverted-foreground/5 text-inverted-foreground hover:bg-inverted-foreground/15 hover:text-inverted-foreground focus-visible:bg-inverted-foreground/15 focus-visible:text-inverted-foreground"
					>
						<Close />
						<span className="sr-only">자산 브라우저 닫기</span>
					</Button>
				</ControllerBrowserClose>
			</div>
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg bg-inverted-foreground/5 py-2 pr-1 pl-2">
				{children}
				{empty && (
					<div className="flex items-center justify-center p-6">
						<Typography
							as="p"
							size="sm"
							className="text-center text-inverted-foreground/80"
						>
							{empty}
						</Typography>
					</div>
				)}
			</div>
		</DialogPrimitive.Content>
	)

	// 패널을 여는 카드는 컨트롤러 패널(overflow-hidden) 안에 산다 — 거기서 뜨면 잘리므로
	// Root 프레임의 형제 자리로 옮긴다. 옮긴 뒤 DOM 순서·기준 박스는 손으로 짰을 때와 같다.
	return frame ? createPortal(content, frame) : content
}

/**
 * 탭을 가진 플로팅 자산 브라우저 — 트리거는 이 컴파운드 안에만 존재한다.
 * 카드 + 열기 버튼 형태의 소비자는 Controller.AssetCard가 이 파츠들을 조립해 만든다.
 */
export const ControllerBrowser = {
	Root: ControllerBrowserRoot,
	Item: ControllerBrowserItem,
	Trigger: ControllerBrowserTrigger,
	Panel: ControllerBrowserPanel,
	Thumbnail: ControllerBrowserThumbnail,
	Close: ControllerBrowserClose,
}

export {
	ControllerBrowserClose,
	ControllerBrowserItem,
	ControllerBrowserPanel,
	ControllerBrowserRoot,
	ControllerBrowserThumbnail,
	ControllerBrowserTrigger,
}
