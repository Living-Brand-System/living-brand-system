# 03. 데이터 생명주기

## 1. 목적

이 문서는 브랜드 운영 시스템에서 주요 데이터가 생성되고, 사용되고, 보관되고, 파기되는 흐름을 정리합니다.
기준은 [02. 유즈케이스](02-usecases.md)와 [04. 도메인 모델](04-domain-model.md)의 최신 구조입니다.

핵심은 원천 기준, 실행 기록, 사용 기록을 섞지 않는 것입니다.
원천 기준은 가이드라인 관리가 소유합니다.
제작은 요청 범위에서 발행 기준과 자원을 사용하고, 품질 검수는 실행 기준을 CheckSession의 CheckRulesetSnapshot으로 고정합니다.

현재 품질 검수 기록은 `CheckSession`, Agent 대화와 사용량 기록은 별도 `AgentChatSession`이 소유합니다.
`AssetGenerationSession`은 아직 수집·저장하지 않으며, 향후 제작 사용량 추적 요구가 정해질 때 도입합니다.

## 2. 작성 기준

각 데이터는 같은 단계로 설명합니다.

| 단계 | 의미 |
| --- | --- |
| 생성·수집 | 데이터가 처음 만들어지거나 외부 입력으로 들어오는 시점 |
| 전송 | UI, Service, Agent, 외부 도구 사이에서 이동하는 방식 |
| 저장 | 주 저장소와 저장 시 보호 기준 |
| 처리 | 상태 변경, 연결, 검증, 파생 데이터 생성 방식 |
| 활용 | 화면, Agent, 검수, 운영 조회에서 쓰이는 방식 |
| 공유·제공 | 다른 도메인, Agent, 외부 서비스에 제공되는 범위 |
| 보관 | 운영 중 유지 기준과 이력 관리 방식 |
| 파기 | 삭제, 비활성화, 익명화, 보관 종료 기준 |

## 3. 가이드라인 기준

### 3.1 BrandGuideline

데이터명: BrandGuideline
수집 목적: 회사명, 문서 제목, 테마처럼 모든 가이드라인 문서에 적용되는 공통 표시 설정을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 회사명, 문서 제목, 발행 표기, 파비콘과 테마 색상을 입력한다. |
| 전송 | Manager UI에서 입력한 값은 Payload API를 통해 global 갱신 요청으로 전달한다. |
| 저장 | Payload global과 PostgreSQL에 저장한다. Payload revision은 CMS 내부 수정 이력으로 남긴다. |
| 처리 | 공통 표시 설정만 관리한다. GuidelineDocument의 편집·발행·삭제 생명주기를 소유하지 않는다. |
| 활용 | Manager는 가이드라인 공통 표시를 편집하고, Creator 화면은 문서 렌더링에 이 설정을 적용한다. |
| 공유·제공 | 가이드라인 화면에 필요한 표시 설정만 제공한다. |
| 보관 | 현재 global 값과 변경 이력을 보관한다. |
| 파기 | 단일 설정이므로 레코드를 삭제하지 않고 필요한 값을 수정한다. |

### 3.2 GuidelineChapter

데이터명: GuidelineChapter
수집 목적: 토픽을 묶는 분류. 사이드바와 인덱스 화면의 그룹이고 토픽 URL의 첫 조각이다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 챕터 제목과 표시 순서를 입력하면 `guideline-chapters` 레코드로 생성한다. slug는 제목에서 만들고 언어 공통이다. |
| 전송 | 챕터 편집 요청은 Payload API로 전달한다. |
| 저장 | 독립 레코드로 저장하고 제목, slug, 표시 순서만 보관한다. 설명·본문·면을 갖지 않는다. |
| 처리 | 토픽이 필수 관계로 챕터를 참조한다. 챕터는 자기 화면을 갖지 않고 `/guideline/<chapter>`는 인덱스로 보낸다. |
| 활용 | 사이드바 트리, 인덱스 카드, 헤더 검색의 그룹 제목에 사용한다. |
| 공유·제공 | 토픽 URL의 첫 조각으로만 노출한다. |
| 보관 | 버전을 갖지 않는다. 현재 값만 보관한다. |
| 파기 | 참조하는 토픽이 있으면 삭제할 수 없다. 토픽을 다른 챕터로 재분류한 뒤 삭제한다. |

### 3.3 GuidelineDocument(토픽)

데이터명: GuidelineDocument
수집 목적: URL을 가진 가이드라인 한 장. 헤더 이미지와 본문 블록을 소유하고 적용할 검수 규칙(Rule)을 참조로 선택한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 챕터, 제목, 표시 순서를 입력하면 `guideline-documents` 레코드로 생성한다. slug는 제목에서 만들고 언어 공통이며 같은 챕터 안에서 유일하다. |
| 전송 | 토픽 편집 요청은 Payload API를 통해 Guideline publishing service로 전달한다. |
| 저장 | 독립 레코드로 저장하고 챕터 관계, 헤더 이미지, 본문 블록, Rule 관계, 표시 순서를 함께 보관한다. 초안과 발행 상태는 Payload version이 관리한다. |
| 처리 | 본문 블록을 임베디드로 소유한다. 섹션(`section` 블록)은 문서가 아니라 블록이라 토픽과 발행 단위를 공유한다. |
| 활용 | Creator 가이드라인 화면, Agent 답변 근거, 품질 검수 기준 탐색, MCP 조회에 사용한다. |
| 공유·제공 | 발행된 토픽만 Creator, Agent, MCP에 제공한다. BehaviorEventLog에는 조회와 클릭 대상인 PageRef만 제공한다. |
| 보관 | Payload revision과 발행 상태를 보관한다. |
| 파기 | 발행 전 토픽은 삭제할 수 있다. 발행 후 draft로 되돌리거나 삭제하면 화면과 검수 대상에서 제외하고 기존 CheckSession snapshot은 보존한다. |

### 3.4 GuidelineBlock

데이터명: GuidelineBlock
수집 목적: 토픽 본문을 구성하는 콘텐츠 단위이자 검수 근거. 섹션(`section`)은 앵커·제목·설명·면을 갖고 다른 블록을 품는 블록이다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 블록 유형과 콘텐츠를 입력하면 토픽 안에 생성한다. 섹션의 앵커는 제목에서 자동 생성하고 한 번 정해지면 제목을 고쳐도 유지한다. |
| 전송 | 토픽 편집 요청에 포함해 Payload API로 전달한다. |
| 저장 | 콘텐츠와 식별자는 소속 토픽 안에 임베디드 데이터로 저장한다. Block 식별자는 부모 토픽 안에서만 유효하다. |
| 처리 | 이미지와 컬러 같은 표시 자원을 참조하고, 적용할 Rule을 관계로 선택한다. 참조 중인 Rule은 삭제할 수 없다. 위젯의 자식 이미지는 표현일 뿐 기계가 읽는 근거가 아니다. |
| 활용 | Creator 화면, Agent 답변 근거, 검수 evidence 생성, 섹션 목차(사이드바 앵커)에 사용한다. |
| 공유·제공 | 발행된 토픽에 포함된 블록만 제공한다. |
| 보관 | 토픽의 Payload revision에 포함해 변경 이력을 보관한다. |
| 파기 | 블록을 제거하면 다음 발행부터 화면과 검수 대상에서 제외한다. 기존 CheckSession snapshot은 보존한다. |

옛 모델의 PagePolicy, PageAssetRef, PageExample은 별도 엔티티로 존재하지 않는다. 정책 문구는 섹션·블록의 설명이, 에셋 연결은 블록의 이미지 leaf가, 예시는 카드(정적 이미지 또는 프리셋 패널 디스플레이)와 블록의 `mark`(Do/OK/Don't)가 각각 블록 안에서 대신한다.

## 4. 브랜드 자원

### 4.1 RuleChecker

데이터명: RuleChecker
수집 목적: Check를 실행할 도구와 호출 계약을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 실행 유형과 실행 도구를 선택하면 draft 상태로 생성한다. |
| 전송 | RuleChecker 편집 요청은 Payload API를 통해 Brand resource publishing service로 전달한다. |
| 저장 | RuleCheckerKey, ExecutorType과 실행 유형별 binding을 저장한다. deterministic은 CheckerKey를, heuristic은 ModelRef와 PromptKey를 저장한다. |
| 처리 | 하나의 RuleChecker는 하나의 executor binding만 가지며 Check의 실행 요청을 해당 실행기로 전달한다. |
| 활용 | 품질 검수는 Check가 참조하는 RuleChecker로 checker 또는 model을 선택한다. |
| 공유·제공 | 검수 런타임에는 live 상태의 RuleCheckerVersion만 제공한다. |
| 보관 | RuleCheckerVersion과 Payload revision을 함께 보관한다. |
| 파기 | draft RuleChecker는 삭제할 수 있다. 발행된 RuleChecker는 archived 상태로 전환하고 기존 검수 기록의 참조는 보존한다. |

### 4.2 Check

데이터명: Check
수집 목적: 토픽(GuidelineDocument), 섹션 블록 또는 그 밖의 GuidelineBlock에 적용할 검수 규칙을 선언한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 문서 단위 안에서 영문·한글 이름, 중요도, 실행 유형별 설정과 RuleChecker를 입력한다. CheckKey는 영문 이름에서 자동 생성하고 저장 전에 전체 Guideline에서 중복을 검사한다. |
| 전송 | Check는 부모 Guideline 문서 편집 요청에 포함해 Payload API로 전달한다. |
| 저장 | CheckKey, 영문·한글 Title, Tier, RuleCheckerRef와 실행 유형에 따른 Options, HeuristicCriteria, HeuristicPrompt, Messages를 부모 토픽 또는 Block 안에 저장한다. 별도 source 필드는 두지 않는다. |
| 처리 | 검수 시작 시 부모 문서 또는 Block의 전체 정규화 콘텐츠와 RuleChecker 실행 계약을 결합한다. 휴리스틱 AI는 HeuristicCriteria별 관찰값만 반환하고, 검수 Service가 기대값과 비교해 최종 상태를 결정한다. Guideline 변경 시 별도 snapshot을 동기화하지 않는다. |
| 활용 | CheckScenario는 CheckKey로 실행 범위를 선택하고, 검수 런타임은 Check options를 RuleChecker에 전달한다. |
| 공유·제공 | Creator와 Agent에는 발행된 GuidelineVersion에 포함된 Check만 제공한다. |
| 보관 | Check는 부모 GuidelineVersion과 Payload revision에 포함해 보관하고, 실행 당시 값은 CheckSession에 snapshot으로 저장한다. |
| 파기 | 부모 토픽이 draft 또는 삭제 상태가 되거나 Block이 제거되면 이후 검수 대상에서 제외한다. 기존 CheckSession snapshot은 보존한다. |

### 4.3 CheckScenario

데이터명: CheckScenario
수집 목적: Manager가 검수 목적별로 실행할 Check를 조립하고 발행한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 이름, 설명, 안정적인 Key와 포함할 CheckKey를 선택해 draft로 생성한다. |
| 전송 | CheckScenario 편집 요청은 Payload API를 통해 전달한다. |
| 저장 | CheckScenarioKey와 순서가 있는 CheckKey 목록을 Payload collection과 PostgreSQL에 저장한다. Check 정의를 복제하지 않는다. |
| 처리 | 발행 시 CheckKey 중복과 published Guideline에 존재하지 않는 Check를 거부한다. |
| 활용 | 검수 시작 시 선택된 CheckKey 범위를 실행하고 실제 Check 정의는 CheckSession snapshot에 고정한다. |
| 공유·제공 | Creator와 Agent에는 published이며 archived가 아닌 CheckScenario만 제공한다. |
| 보관 | draft와 published revision을 Payload version으로 보관한다. |
| 파기 | 발행 전 draft는 삭제할 수 있다. 한 번 발행된 CheckScenario는 삭제하지 않고 archived로 전환한다. |

### 4.4 CheckException

데이터명: CheckException
수집 목적: 특정 Check에 종속되는 예외 조건과 적용 기간을 관리한다. 현재 구현 범위에서는 제외한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 예외 조건, 예외 사유, 적용 기간을 입력하면 Check 아래에 생성한다. |
| 전송 | 예외 등록 요청은 Payload API를 통해 Brand resource publishing service로 전달한다. |
| 저장 | Check 하위 값으로 저장하고 ExceptionReason과 적용 기간을 보관한다. |
| 처리 | Check options와 함께 평가되어 예외 적용 여부를 판단한다. |
| 활용 | Agent 답변과 품질 검수에서 위반 여부를 해석할 때 사용한다. |
| 공유·제공 | GuidelineVersion에 포함된 예외 조건으로 Creator와 Agent에 제공한다. |
| 보관 | 예외 적용 기간과 변경 사유를 보관한다. |
| 파기 | 적용 종료 후에는 archived 상태로 남기고, 잘못 만든 draft 예외만 삭제한다. |

### 4.5 BrandAsset

데이터명: BrandAsset
수집 목적: 로고, 이미지, 아이콘, 참고 파일 같은 공식 브랜드 자원을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 에셋 파일, 에셋 유형, 메타데이터를 입력하면 BrandAsset을 생성한다. |
| 전송 | 파일과 메타데이터는 Payload upload 흐름을 통해 전송한다. |
| 저장 | 파일은 Uploaded file storage에 저장하고, 메타데이터는 Payload collection과 PostgreSQL에 저장한다. |
| 처리 | AssetFile, BrandAssetVersion, UsageCondition, DownloadStatus를 함께 관리한다. |
| 활용 | GuidelineDocument, Check, CheckBasis에서 공식 자원으로 참조한다. 향후 AssetGenerationSession을 도입하면 제작 ResourceRef에도 사용한다. |
| 공유·제공 | Creator에게 다운로드 가능한 live 상태의 BrandAssetVersion만 제공한다. |
| 보관 | 파일 원본, Official Version, 사용 조건, 폐기 사유를 보관한다. |
| 파기 | draft 파일은 삭제할 수 있다. 발행된 에셋은 archived 처리하고 실제 파일 삭제는 참조 종료 후 수행한다. |

### 4.6 Template

데이터명: Template
수집 목적: Creator가 산출물을 만들 때 사용할 공식 형식을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 템플릿 이름, 설명, Figma 노드 또는 템플릿 파일 참조를 입력하면 Template을 생성한다. |
| 전송 | 템플릿 메타데이터는 Payload API로 전달하고, 원본은 Figma node 또는 파일 업로드 흐름으로 참조한다. |
| 저장 | TemplateSourceRef, LayoutSpec, TextStyleSpec, EditableBlockSpec, TemplateUsageCondition, TemplateVersion을 함께 저장한다. |
| 처리 | 지정된 레이아웃, 텍스트 스타일, 텍스트 블록, 에셋 슬롯, 컬러 토큰과 BrandAssetVersionRef를 검증한다. |
| 활용 | 현재 Create에서 산출물 제작 형식으로 사용한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 기록한다. |
| 공유·제공 | Creator에게 live 상태의 TemplateVersion만 제공한다. |
| 보관 | TemplateVersion과 사용 조건 변경 이력을 보관한다. |
| 파기 | draft 템플릿은 삭제할 수 있다. 발행된 템플릿은 archived 처리한다. 향후 AssetGenerationSession 참조를 도입하면 기존 참조는 보존한다. |

### 4.7 Plugin

데이터명: Plugin
수집 목적: Creator가 산출물을 만들 때 사용할 공식 제작 기능을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 플러그인 이름, 설명, 유형, 실행물 참조를 입력하면 Plugin을 생성한다. |
| 전송 | 플러그인 설정은 Payload API를 통해 저장하고, 테스트 실행은 Agent repository로 전달한다. |
| 저장 | PluginEntry, PluginCapability, PluginUsageCondition, PluginVersion과 Plugin runtime 참조를 함께 저장한다. |
| 처리 | 입력 스키마, 출력 형식, 사용 조건, 연결된 TemplateVersionRef와 CheckKey를 검증한다. |
| 활용 | 현재 제작 기능에서 사용한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 기록한다. |
| 공유·제공 | Creator에게 live 상태의 PluginVersion만 제공한다. |
| 보관 | PluginVersion, 테스트 결과 참조, 사용 조건 변경 이력을 보관한다. |
| 파기 | draft 플러그인은 삭제할 수 있다. 발행된 플러그인은 archived 처리하고 기존 실행 이력은 보존한다. |

## 5. Official Version

### 5.1 BrandGuidelineVersion

데이터명: BrandGuidelineVersion
수집 목적: Creator와 Agent가 참조할 Official Version을 만든다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Manager가 승인된 BrandGuideline을 발행하면 System이 stage 또는 live 상태의 BrandGuidelineVersion을 생성한다. |
| 전송 | 발행 요청은 Guideline publishing service로 전달한다. |
| 저장 | VersionNumber, VersionStatus, EffectivePeriod, PayloadRevisionRef, PreviousVersionRef를 저장한다. |
| 처리 | live 전환 시 기존 live 상태의 BrandGuidelineVersion은 archived 상태로 바꾼다. |
| 활용 | CheckBasis는 필요한 VersionRef로 참조한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 참조한다. |
| 공유·제공 | Creator 화면과 Agent에는 live 상태의 BrandGuidelineVersion만 제공한다. |
| 보관 | stage, live, archived 상태와 VersionReason을 보관한다. |
| 파기 | Official Version은 삭제하지 않고 archived로 보관한다. 잘못 생성된 stage 상태의 BrandGuidelineVersion만 삭제할 수 있다. |

### 5.2 RuleCheckerVersion

데이터명: RuleCheckerVersion
수집 목적: 품질 검수에서 사용할 실행 도구와 호출 계약을 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | RuleChecker가 승인되거나 수정되면 System이 RuleCheckerVersion 후보를 만든다. |
| 전송 | Official Version 생성 요청은 Brand resource publishing service로 전달한다. |
| 저장 | VersionNumber, VersionStatus, ExecutorType, CheckerKey 또는 ModelRef와 PromptKey, PayloadRevisionRef를 저장한다. |
| 처리 | live 전환 시 기존 live 상태의 RuleCheckerVersion을 archived 상태로 바꾼다. |
| 활용 | GuidelineVersion의 Check와 검수 런타임이 실행 도구를 선택할 때 참조한다. |
| 공유·제공 | 검수 런타임에는 live 상태의 RuleCheckerVersion만 제공한다. |
| 보관 | 모든 Official Version과 변경 사유를 보관한다. |
| 파기 | Official Version은 삭제하지 않고 archived로 보관한다. 잘못 생성된 stage 상태만 삭제할 수 있다. |

### 5.3 CheckRulesetSnapshot

데이터명: CheckRulesetSnapshot
수집 목적: 품질 검수 실행 당시의 문서 근거, Check, RuleChecker 계약을 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | CheckSession을 시작할 때 발행된 Guideline에서 선택된 Check와 문서 근거를 읽어 생성한다. |
| 전송 | 검수 Service가 CheckSession 저장 Repository에 전달한다. |
| 저장 | CheckKey, 영문·한글 Title, Tier, Options, HeuristicCriteria, HeuristicPrompt, Messages, RuleChecker 실행 계약, `source.documentId`, 타입별 구조화 Evidence, 역할이 포함된 ReferenceAssetRef를 JSON snapshot으로 저장한다. Block 식별자와 문서 제목은 중복 저장하지 않는다. |
| 처리 | 즉시 검수와 후속 AI 검수가 같은 snapshot을 사용한다. Guideline이나 RuleChecker 변경을 역으로 반영하지 않는다. |
| 활용 | CheckRun과 결과 재현, 감사, 후속 AI 검수에 사용한다. |
| 공유·제공 | CheckSession 조회 권한이 있는 Manager와 Admin에게 제공한다. MCP 검수에서는 인증된 사용자가 연결한 외부 AI에 구조화 Evidence, HeuristicPrompt, RuleChecker 프롬프트와 역할이 표시된 레퍼런스 이미지를 제공하되 기대값·연산자와 내부 URL은 제외한다. |
| 보관 | CheckSession과 함께 보관한다. |
| 파기 | CheckSession 보관 정책을 따른다. |

### 5.4 BrandAssetVersion

데이터명: BrandAssetVersion
수집 목적: 공식으로 사용할 수 있는 브랜드 에셋 파일과 사용 조건을 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | BrandAsset이 발행되면 System이 BrandAssetVersion을 생성한다. |
| 전송 | 발행 요청과 파일 참조는 Brand resource publishing service로 전달한다. |
| 저장 | VersionStatus, AssetFile 참조, UsageCondition, DownloadStatus를 저장한다. |
| 처리 | 대체 에셋이 발행되면 이전 BrandAssetVersion을 archived 상태로 바꾼다. |
| 활용 | PageAssetRef와 CheckBasis에서는 BrandAssetVersionRef로 참조한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 참조한다. |
| 공유·제공 | Creator에게 다운로드 가능한 live 상태의 BrandAssetVersion만 제공한다. |
| 보관 | 파일 참조, 다운로드 상태, 폐기 사유를 보관한다. |
| 파기 | Official Version은 삭제하지 않고 archived로 보관한다. 파일은 참조 종료 후 보관 정책에 따라 삭제한다. |

### 5.5 TemplateVersion

데이터명: TemplateVersion
수집 목적: 제작에 사용할 공식 템플릿 구조와 입력 조건을 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Template이 승인되면 System이 TemplateVersion을 생성한다. |
| 전송 | 발행 요청은 Brand resource publishing service로 전달한다. |
| 저장 | TemplateSourceRef, LayoutSpec, TextStyleSpec, EditableBlockSpec, TemplateUsageCondition, VersionStatus를 저장한다. |
| 처리 | live 전환 시 기존 live 상태의 TemplateVersion을 archived 상태로 바꾸고, Figma node 또는 파일 원본을 재해석해 제작 가능한 구조를 고정한다. |
| 활용 | 현재 제작 기능에서 사용한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 참조한다. |
| 공유·제공 | Creator에게 live 상태의 TemplateVersion만 제공한다. |
| 보관 | 발행된 편집 가능 영역과 사용 조건을 보관한다. |
| 파기 | Official Version은 삭제하지 않고 archived로 보관한다. 잘못 만든 stage 상태의 TemplateVersion만 삭제할 수 있다. |

### 5.6 PluginVersion

데이터명: PluginVersion
수집 목적: 제작에 사용할 공식 플러그인 기능과 실행 조건을 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Plugin이 승인되면 System이 PluginVersion을 생성한다. |
| 전송 | 발행 요청은 Brand resource publishing service로 전달한다. |
| 저장 | PluginEntry, PluginCapability, PluginUsageCondition, VersionStatus를 저장한다. |
| 처리 | live 전환 시 기존 live 상태의 PluginVersion을 archived 상태로 바꾼다. |
| 활용 | 현재 제작 기능에서 사용한다. 향후 AssetGenerationSession을 도입하면 ResourceRef로 참조한다. |
| 공유·제공 | Creator에게 live 상태의 PluginVersion만 제공한다. |
| 보관 | 발행된 실행 조건과 기능 정의를 보관한다. |
| 파기 | Official Version은 삭제하지 않고 archived로 보관한다. 잘못 만든 stage 상태의 PluginVersion만 삭제할 수 있다. |

## 6. 생성 이미지와 에셋 제너레이션 기록

현재 Create 기능은 요청 범위에서 입력과 결과를 다루며 `AssetGenerationSession`, `AssetGenerationInput`, `AssetGenerationOutput`을 저장하지 않습니다.
Image 기능의 프로파일 기반 생성은 `generated-images`에 결과 파일과 실행 조건을 저장합니다. 저장 전 Admin 프로파일 테스트는 레코드를 만들지 않습니다.
이 모델은 향후 제작 사용량을 사용자·기간·기능별로 추적해야 할 때만 도입합니다.
현재 `CheckSession`은 업로드된 이미지를 직접 입력으로 받으므로 이 계획 모델에 의존하지 않습니다.

### 6.1 GeneratedImage

데이터명: GeneratedImage
수집 목적: Studio 생성 이미지를 공식 가이드라인 이미지와 분리하고 생성 당시 입력·실행 조건을 보존한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 프로파일 기반 이미지 생성 service가 결과 파일, 이미지 프로파일, 원본·최종 프롬프트, 모델, 출력 조건, 참조 원본(있으면), 생성 사용자를 기록한다. |
| 전송 | 인증된 생성 route가 trusted Payload upload 흐름으로 전달한다. |
| 저장 | 파일은 `generated-images` object storage에, 실행 조건과 사용자 ID는 Payload collection과 PostgreSQL에 저장한다. |
| 처리 | 생성 당시 값은 수정하지 않고 템플릿이 사용할 때 파일 참조만 연결한다. |
| 활용 | Studio 결과 조회와 템플릿 배경 이미지 참조에 사용한다. |
| 공유·제공 | 생성 메타데이터는 Manager에게만 제공하고, 발행된 파일만 공개 화면에서 읽는다. |
| 보관 | 생성 API가 안정적인 URL을 반환할 수 있도록 결과를 published 파일로 보관한다. |
| 파기 | 현재 자동 삭제하지 않는다. 보관 기간과 참조 추적 요구가 정해지면 published 파일 파기 정책을 추가한다. |

### 6.2 AssetGenerationSession

데이터명: AssetGenerationSession
수집 목적: 향후 Creator의 제작 사용량과 사용한 ResourceRef를 한 실행 단위로 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 도입 시 제작 요청 시작과 완료 시점, 사용자, 기능, ResourceRef를 수집한다. |
| 전송 | 제작 서비스가 사용량 기록 Repository에 전달한다. |
| 저장 | 세션 식별자, 사용자, 기능, ResourceRef, 상태와 집계에 필요한 최소 사용량만 저장한다. |
| 처리 | 사용자·기간·기능별 사용량으로 집계한다. 제작 화면 복원이나 검수 소유권에는 사용하지 않는다. |
| 활용 | 운영 사용량 조회와 비용 분석에만 사용한다. |
| 공유·제공 | 운영 조회에 필요한 식별자와 집계값만 제공한다. |
| 보관 | 도입 전에 보관 기간과 개인정보 제거 기준을 별도로 정한다. |
| 파기 | 도입 전에 참조 무결성과 익명화 기준을 별도로 정한다. |

## 7. Agent 채팅 기록

`AgentChatSession`은 품질 검수의 `CheckSession`과 다른 애그리거트입니다.
기존 문서의 `QASession` 표기는 `CheckSession`으로 통일하며, 별도 `Question`, `Answer` 애그리거트는 현재 저장 모델에 두지 않습니다.

### 7.1 AgentChatSession

데이터명: AgentChatSession
수집 목적: Agent 대화, 도구·스킬 사용, AI 사용량과 사용자 반응을 한 요청 단위로 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 Agent 채팅 요청을 보내면 System이 세션을 시작하고 메시지와 요청 경로를 수집한다. |
| 전송 | Agent 채팅 route가 서비스에 전달하고, 서비스가 Agent 실행 결과를 세션에 반영한다. |
| 저장 | 메시지, 상태, 사용한 도구·스킬, AI 사용량, 반응, 오류와 완료 시각을 `agent-chat-sessions`에 저장한다. |
| 처리 | 실행 결과에 따라 세션을 완료 또는 실패로 전환하고 사용량을 합산한다. |
| 활용 | 대화 이력, Agent 사용량과 품질 확인에 사용한다. 채팅에서 에셋 검수를 실행하면 CheckSession이 이 세션을 출처로 선택 참조할 수 있다. |
| 공유·제공 | 운영 조회에는 필요한 식별자, 상태와 집계값만 제공한다. |
| 보관 | Agent 운영 분석과 오류 조사에 필요한 기간 보관한다. |
| 파기 | 보관 기간 종료 후 메시지를 삭제하거나 사용자 식별 정보를 제거한다. 연결된 CheckSession은 독립 생명주기를 유지한다. |

## 8. 품질 검수 기록

현재 독립 저장 단위는 `CheckSession`입니다.
아래 `CheckTarget`, `CheckRun`, `CheckBasis`, `CheckDecision`은 목표 도메인 구조를 설명하며, 현재 값은 CheckSession 레코드에 평탄화되어 있습니다.

### 8.1 CheckInputSnapshot

데이터명: CheckInputSnapshot
수집 목적: 검수 시점에 업로드된 이미지를 변경되지 않는 입력 지문으로 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Creator가 검수를 요청하면 System이 현재 입력을 참조 고정한다. 업로드 이미지는 실제 바이트에서 SHA-256·감지된 미디어 형식·바이트 크기를 만든다. |
| 전송 | 검수 요청은 Creator UI에서 Client fetch route handler를 거쳐 Quality check service로 전달한다. |
| 저장 | 업로드 이미지는 CheckSession에 SHA-256·미디어 형식·바이트 크기를 저장하고 원본 바이트는 실행 중에만 유지한다. AssetGenerationOutput 참조 연결은 해당 입력 유형을 도입할 때 추가한다. |
| 처리 | 후속 AI 검수는 세션 시작 시점의 지문과 실제 입력이 일치할 때만 결과를 병합한다. 지문이 없는 과거 세션은 신규 입력과 같다고 추정하지 않는다. |
| 활용 | CheckTarget, CheckRun, Check History 조회의 기준 입력으로 사용한다. |
| 공유·제공 | Agent에는 점검에 필요한 산출물 내용만 제공한다. MCP 검수에서는 인증된 사용자가 연결한 외부 AI에 검사 이미지 바이트를 제공한다. |
| 보관 | CheckSession과 CheckResult가 참조하는 동안 보관한다. |
| 파기 | 보관 기간 종료 후 삭제한다. 검수 이력 보존이 필요하면 식별 가능한 내용을 제거한 기록만 남긴다. |

### 8.2 CheckSession

데이터명: CheckSession
수집 목적: 특정 CheckInputSnapshot에 대한 검수 흐름 전체를 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | CheckInputSnapshot이 만들어지면 System이 CheckSession을 시작한다. |
| 전송 | 검수 시작 요청은 Quality check service로 전달한다. |
| 저장 | 현재 구현은 입력 지문, ruleset snapshot, pending Check key, 결과, 상태, `createdBy`를 CheckSession에 평탄화해 저장한다. CheckTarget·CheckRun 하위 모델은 재검수 이력이 필요할 때 분리한다. |
| 처리 | 점검 실행, 판정, 완료 상태를 같은 세션 안에서 묶는다. |
| 활용 | Creator 검수 결과 조회와 운영자의 점검 이력 조회에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 식별자와 상태만 제공한다. |
| 보관 | 검수 감사와 운영 조회에 필요한 기간 보관한다. |
| 파기 | 보관 기간 종료 후 삭제하거나 사용자 식별 정보를 제거한다. |

### 8.3 CheckTarget

데이터명: CheckTarget
수집 목적: CheckSession이 어떤 입력을 검수하는지 명확히 고정한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | CheckSession 시작 시 CheckInputSnapshot을 대상으로 생성한다. |
| 전송 | CheckSession 생성 요청 안에 포함되어 Quality check service로 전달된다. |
| 저장 | CheckSession 하위 값 객체 또는 하위 엔티티로 저장한다. |
| 처리 | 검수 대상 유형, 원본 AssetGenerationOutput 참조, CheckInputSnapshot 참조를 연결한다. |
| 활용 | CheckRun이 어떤 입력을 점검했는지 식별하는 데 사용한다. |
| 공유·제공 | Agent에는 필요한 입력 식별자와 내용 참조만 제공한다. |
| 보관 | CheckSession과 같은 기간 보관한다. |
| 파기 | CheckSession 파기 시 함께 삭제한다. |

### 8.4 CheckRun

데이터명: CheckRun
수집 목적: CheckSession 안에서 실행된 점검 1회를 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | System 또는 Agent가 점검을 실행하면 CheckRun을 생성한다. |
| 전송 | 점검 요청과 Agent 실행 결과는 Quality check service로 전달된다. |
| 저장 | CheckBasis, CheckDecision, AgentRunRef를 연결해 저장한다. |
| 처리 | 점검 기준을 CheckBasis로 고정하고, 점검 결과를 CheckDecision 아래에 만든다. |
| 활용 | 검수 이력 조회와 Agent 품질 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 점검 상태와 결과만 제공한다. |
| 보관 | CheckSession 보관 기간에 맞춰 보관한다. |
| 파기 | CheckSession 파기 시 함께 삭제하거나 AgentRunRef만 남긴다. |

### 8.5 CheckBasis

데이터명: CheckBasis
수집 목적: 점검 실행 시점의 GuidelineVersionRef, CheckRulesetSnapshot, BrandAssetVersionRef를 한 묶음으로 저장한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | CheckRun 시작 시 System이 GuidelineVersionRef, CheckRulesetSnapshot, BrandAssetVersionRef를 수집한다. |
| 전송 | 기준 참조는 Quality check service에서 Agent repository로 전달된다. |
| 저장 | CheckRun 하위 엔티티로 저장하고 각 VersionRef를 값 객체로 보관한다. |
| 처리 | Agent와 System이 같은 기준으로 판단하도록 기준 묶음을 잠근다. |
| 활용 | CheckResult 해석과 검수 재현에 사용한다. |
| 공유·제공 | Agent에는 점검에 필요한 live 상태의 Official Version 내용만 제공한다. |
| 보관 | CheckRun과 같은 기간 보관한다. |
| 파기 | CheckRun 파기 시 함께 삭제한다. |

### 8.6 CheckDecision

데이터명: CheckDecision
수집 목적: 하나의 CheckRun에 대한 최종 판정과 결과 묶음을 관리한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 점검 실행이 끝나면 System이 CheckDecision을 생성한다. |
| 전송 | Agent 또는 System 판정 결과는 Quality check service로 전달된다. |
| 저장 | CheckRun 하위 엔티티로 저장하고 CheckOutcome을 보관한다. |
| 처리 | 여러 CheckResult를 소유하고 통과, 주의, 실패 같은 최종 상태를 계산한다. |
| 활용 | Creator 검수 결과 화면과 점검 이력 조회에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 판정 결과만 제공한다. |
| 보관 | CheckRun과 같은 기간 보관한다. |
| 파기 | CheckRun 파기 시 함께 삭제하거나 식별 정보를 제거한 판정 통계만 남긴다. |

### 8.7 CheckResult

데이터명: CheckResult
수집 목적: CheckDecision 안에서 개별 위반, 통과, 경고 결과를 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | System 또는 Agent가 기준별 점검 결과를 만들면 CheckDecision 아래에 생성한다. |
| 전송 | 점검 결과는 Agent repository 또는 System 점검 로직에서 Quality check service로 전달된다. |
| 저장 | CheckDecision 하위 엔티티로 저장하고 Violation과 CheckRecommendation을 연결한다. |
| 처리 | CheckBasis의 기준 참조와 연결해 위반 원인과 심각도를 해석한다. |
| 활용 | Creator 수정 안내와 점검 이력 조회에 사용한다. |
| 공유·제공 | Manager와 Creator에게 필요한 결과와 근거만 제공한다. |
| 보관 | CheckDecision과 같은 기간 보관한다. |
| 파기 | CheckDecision 파기 시 함께 삭제하거나 통계용 익명 집계만 남긴다. |

### 8.8 CheckRecommendation

데이터명: CheckRecommendation
수집 목적: CheckResult별 수정 방향과 권장 조치를 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Agent가 위반 항목별 수정 방향을 생성하면 System이 CheckResult 아래에 저장한다. |
| 전송 | Agent 응답은 Agent repository에서 Quality check service로 전달된다. |
| 저장 | CheckResult 하위 값 객체 또는 하위 기록으로 저장하고 AgentRunRef를 연결한다. |
| 처리 | 위반 내용, 권장 수정, 우선순위, 설명을 CheckResult에 연결한다. |
| 활용 | Creator 수정 안내에 사용한다. |
| 공유·제공 | Creator에게 수정 지시로 제공한다. |
| 보관 | CheckResult와 같은 기간 보관한다. |
| 파기 | CheckResult 파기 시 함께 삭제한다. |

## 9. 사용 기록

### 9.1 BehaviorEventLog

데이터명: BehaviorEventLog
수집 목적: 가이드라인 화면의 조회, 클릭, 에셋 다운로드, 구간 체류를 저장한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | Creator 또는 Manager가 가이드라인 화면을 탐색하면 PageViewEvent, ClickEvent, AssetDownloadEvent, SectionDwellEvent, SearchEvent, OutboundLinkEvent, CustomEvent를 수집한다. |
| 전송 | 화면 이벤트는 Client fetch route handler를 거쳐 Behavior event service로 전달한다. |
| 저장 | Behavior event service가 BehaviorEventLog를 저장하고 필요한 이벤트를 Umami analytics로 전달한다. |
| 처리 | PageRef, ElementRef, Duration, SessionData를 공통 속성으로 연결한다. |
| 활용 | 화면 행동 기록 조회와 에셋 다운로드 이력 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | 운영 조회 요구에 맞춰 보관한다. |
| 파기 | 보관 기간 종료 후 삭제하거나 SessionData에서 식별 가능한 값을 제거한다. |

### 9.2 PageViewEvent

데이터명: PageViewEvent
수집 목적: 가이드라인 페이지 조회 여부와 조회 시점을 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 가이드라인 토픽 화면을 열면 화면 이벤트로 생성한다. |
| 전송 | 클라이언트에서 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장한다. |
| 처리 | PageRef, SessionData, OccurredAt을 연결한다. |
| 활용 | 페이지 조회 이력 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

### 9.3 ClickEvent

데이터명: ClickEvent
수집 목적: 가이드라인 화면에서 사용자가 누른 요소를 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 버튼, 링크, 탭, 필터를 클릭하면 생성한다. |
| 전송 | 클라이언트에서 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장한다. |
| 처리 | ElementRef, PageRef, SessionData를 연결한다. |
| 활용 | 화면 요소 클릭 이력 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

### 9.4 AssetDownloadEvent

데이터명: AssetDownloadEvent
수집 목적: 공식 에셋 다운로드 횟수와 사용 맥락을 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 BrandAssetVersion을 다운로드하면 생성한다. |
| 전송 | 다운로드 요청 처리 후 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장하고 BrandAssetVersionRef를 연결한다. |
| 처리 | PageRef, AssetRef, SessionData를 연결한다. |
| 활용 | 에셋 다운로드 이력 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

### 9.5 SectionDwellEvent

데이터명: SectionDwellEvent
수집 목적: 가이드라인 화면의 특정 구간 체류 시간을 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 페이지 특정 구간에 머문 시간이 기준을 넘으면 생성한다. |
| 전송 | 클라이언트에서 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장하고 Duration을 보관한다. |
| 처리 | PageRef, SectionRef, Duration, SessionData를 연결한다. |
| 활용 | 구간 체류 이력 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

### 9.6 SearchEvent

데이터명: SearchEvent
수집 목적: 가이드라인 화면에서 사용자가 검색한 기준과 결과 선택 맥락을 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 가이드라인 화면에서 검색을 실행하면 생성한다. |
| 전송 | 클라이언트에서 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장하고 검색어와 결과 참조를 보관한다. |
| 처리 | Query, ResultRef, PageRef, SessionData를 연결한다. |
| 활용 | 기준 탐색 흐름과 검색 실패 지점 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제하거나 검색어에서 식별 가능한 내용을 제거한다. |

### 9.7 OutboundLinkEvent

데이터명: OutboundLinkEvent
수집 목적: 가이드라인 화면에서 외부 자료로 이동한 행동을 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 사용자가 외부 링크를 클릭하면 생성한다. |
| 전송 | 클라이언트에서 Client fetch route handler를 거쳐 Behavior event service로 전송한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장하고 링크 대상 참조를 보관한다. |
| 처리 | LinkRef, PageRef, SessionData를 연결한다. |
| 활용 | 외부 자료 의존도와 이동 경로 확인에 사용한다. |
| 공유·제공 | 운영 조회에는 필요한 범위만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

### 9.8 CustomEvent

데이터명: CustomEvent
수집 목적: 기본 이벤트로 표현하기 어려운 화면별 운영 이벤트를 기록한다.

| 단계 | 작성 내용 |
| --- | --- |
| 생성·수집 | 특정 화면에서 별도 기록이 필요한 행동이 발생하면 생성한다. |
| 전송 | 클라이언트는 Client fetch route handler를 거치고, 서버는 내부 요청으로 Behavior event service에 전달한다. |
| 저장 | BehaviorEventLog 하위 이벤트로 저장하고 EventPayload를 보관한다. |
| 처리 | 이벤트 이름, PageRef, SessionData, payload 스키마를 검증한다. |
| 활용 | 화면별 운영 지표에 사용한다. |
| 공유·제공 | 운영 조회에는 검증된 이벤트만 제공한다. |
| 보관 | BehaviorEventLog 보관 기간에 맞춰 보관한다. |
| 파기 | BehaviorEventLog 파기 시 함께 삭제한다. |

## 10. 설계 원칙

- Agent는 정책과 규칙을 직접 변경하지 않습니다.
- CheckInputSnapshot은 검수 입력을 고정하고, CheckBasis는 검수 기준 VersionRef를 저장합니다.
- CheckDecision은 하나의 최종 판정이고, 여러 CheckResult를 소유합니다.
- CheckResult는 필요한 경우 CheckRecommendation을 소유합니다.
