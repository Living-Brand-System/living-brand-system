# 02. 유즈케이스

## 1. 목적

이 문서는 `04. 도메인 모델`을 기준으로 유즈케이스를 프로세스 중심으로 정리합니다.
목표는 각 유즈케이스에서 누가 무엇을 입력하고, System이 어떤 순서로 처리하며, 어떤 결과와 기록이 남는지 합의하는 것입니다.

데이터 생명주기는 이 유즈케이스 목록을 기준으로 다시 정리합니다.
따라서 이 문서에서는 `03. 데이터 생명주기`보다 `04. 도메인 모델`의 최신 구조를 우선합니다.

## 2. 목차

1. 목적
2. 목차
3. 유즈케이스 작성 기준
4. 유즈케이스 상세 스키마
5. 도메인별 유즈케이스 목록

## 3. 유즈케이스 작성 기준

유즈케이스는 화면 메뉴나 단순 CRUD 목록이 아닙니다.
각 항목은 Manager, Creator, System, Agent가 실제로 수행하는 업무 흐름입니다.

| 기준 | 설명 |
| --- | --- |
| 도메인 기준 | 가이드라인 관리, 제작 관리, 품질 검수, 사용 기록으로 나눕니다. |
| 프로세스 기준 | 각 유즈케이스는 한 문장으로 핵심 처리 흐름을 설명합니다. |
| 결과 기준 | 아웃풋은 사용자나 System이 바로 받는 결과입니다. |
| 기록 기준 | 생성 데이터는 이후 검수, 로그, Official Version에 쓰이는 데이터입니다. |
| 연결 기준 | 다음 연결은 이어지는 유즈케이스를 가리킵니다. |

## 4. 유즈케이스 상세 스키마

유즈케이스 목록은 다음 스키마를 사용합니다.

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RULE-01 | 규칙 명세 등록 | Manager, System | 규칙 이름, 범위, 기본 심각도, 측정 단위 | Manager가 브랜드 공통 규칙 명세를 입력하면 System이 RuleChecker를 draft 상태로 저장합니다. | Draft RuleChecker | RuleChecker, RuleScope, RuleCheckerUpdated | 브랜드 규칙 채택 |

## 5. 도메인별 유즈케이스 목록

### 5.1 가이드라인 관리

가이드라인 관리는 공통 표시 설정인 BrandGuideline과 독립 편집·발행 단위인 GuidelineDocument, 공식 자원을 관리합니다.
Creator가 사용하는 기준과 자원은 이 도메인에서 발행된 것만 사용합니다.

#### 브랜드 가이드라인 편집 및 발행

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GL-01 | 가이드라인 기본 정보 편집 | Manager, System | 회사명, 문서 제목, 발행 표기, 테마 | Manager가 공통 표시 정보를 수정하면 System이 BrandGuideline global을 갱신합니다. | Updated BrandGuideline | BrandGuideline | 가이드라인 문서 초안 생성 |
| GL-02 | 가이드라인 문서 초안 생성 | Manager, System | 제목, 설명, slug, 표시 순서 | Manager가 문서를 만들면 System이 독립 GuidelineDocument draft를 저장합니다. | Draft GuidelineDocument | GuidelineDocument, Payload revision | 문서 계층 구성 |
| GL-03 | 토픽을 챕터에 배치 | Manager, System | GuidelineDocument, GuidelineChapter | Manager가 챕터를 선택하면 System이 같은 챕터 안의 slug 중복을 확인해 관계를 저장합니다. 챕터는 분류일 뿐 자기 화면이 없습니다. | Categorized GuidelineDocument | ChapterRef | 문서 블록 작성 |
| GL-04 | 문서 블록 작성 | Manager, System | GuidelineDocument, 블록 유형, 콘텐츠 | Manager가 본문 블록을 작성하면 System이 GuidelineBlock 목록을 문서에 임베드합니다. | GuidelineBlock | GuidelineBlock, Payload revision | 규칙을 문서에 연결 |
| GL-05 | 규칙을 문서에 연결 | Manager, System | GuidelineDocument 또는 GuidelineBlock, Rule | Manager가 발행 규칙을 선택하면 System이 Rule 관계를 저장합니다. Rule 정의는 변경하지 않습니다. | Rule reference | RuleRef, Payload revision | 문서 초안 미리보기 |
| GL-06 | 에셋을 문서에 연결 | Manager, System | GuidelineDocument 또는 GuidelineBlock, 공식 에셋 | Manager가 헤더나 블록 에셋을 선택하면 System이 공식 에셋 관계를 저장합니다. | Asset reference | ApplicationImageRef 또는 BrandAssetRef, Payload revision | 문서 초안 미리보기 |
| GL-07 | 문서 초안 미리보기 | Manager, System | Draft GuidelineDocument | Manager가 미리보기를 열면 System이 draft 문서(섹션 블록 포함)를 읽어 실제 화면 구조로 렌더합니다. | Draft preview | - | 가이드라인 문서 발행 |
| GL-08 | 가이드라인 문서 발행 | Manager, System | Draft GuidelineDocument | Manager가 발행하면 System이 해당 GuidelineDocument revision을 published 상태로 전환합니다. | Published GuidelineDocument | Payload revision, GuidelinePublished | 발행 가이드라인 조회 |
| GL-09 | 가이드라인 문서 예약 발행 | Manager, System | Draft GuidelineDocument, 예약 시각 | Manager가 예약하면 Payload가 해당 문서 revision의 예약 발행을 실행합니다. | Scheduled GuidelineDocument | Payload revision | 발행 가이드라인 조회 |
| GL-10 | 발행 가이드라인 조회 | Creator, Agent, System | locale, 문서 경로 | System이 published GuidelineDocument 계층과 BrandGuideline 표시 설정을 조합해 제공합니다. | Published guideline view | - | 검수 또는 Agent 답변 |

#### 브랜드 자원 관리

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RULE-01 | 규칙 명세 등록 | Manager, System | 규칙 이름, 범위, 기본 심각도, 측정 단위, 검출 방법 | Manager가 브랜드 공통 규칙 명세를 입력하면 System이 RuleChecker를 draft 상태로 저장합니다. | Draft RuleChecker | RuleChecker, RuleScope, RuleCheckerUpdated | 브랜드 규칙 채택 |
| RULE-02 | 브랜드 규칙 채택 | Manager, System | RuleChecker, 브랜드 기준값, 출처 | Manager가 브랜드가 사용할 규칙 명세와 기준값을 입력하면 System이 BrandRule을 저장합니다. | Draft BrandRule | BrandRule, RuleValue, SourceRef, BrandRuleAdopted | stage 상태의 Official Version 생성 |
| RULE-03 | 브랜드 규칙 수정 | Manager, System | 기존 BrandRule, 수정 기준값, VersionReason | Manager가 브랜드 기준값을 수정하면 System이 충돌을 확인하고 새 BrandRuleVersion 후보를 저장합니다. | Updated BrandRule | BrandRule, RuleValue, VersionReason, BrandRuleValueUpdated | stage 상태의 Official Version 생성 |
| RULE-04 | 규칙 충돌 확인 | Manager, System | 신규 또는 수정 BrandRule, 적용 범위 | System이 같은 범위의 기존 BrandRule과 조건을 비교해 충돌 여부를 판단합니다. | Conflict Result | - | 브랜드 규칙 채택 또는 브랜드 규칙 수정 |
| RES-01 | 브랜드 에셋 등록 | Manager, System | 에셋 파일, 에셋 유형, 메타데이터 | Manager가 파일과 메타데이터를 입력하면 System이 BrandAsset과 AssetFile을 저장합니다. | Draft BrandAsset | BrandAsset, AssetFile, AssetType, BrandAssetRegistered | 브랜드 에셋 발행 |
| RES-02 | 브랜드 에셋 발행 | Manager, System | Draft BrandAsset, 사용 조건 | Manager가 발행하면 System이 BrandAssetVersion을 live 상태로 전환하고 다운로드 가능 상태로 바꿉니다. | Live BrandAsset | BrandAssetVersion, UsageCondition, DownloadStatus, BrandAssetPublished | 에셋을 페이지에 연결 |
| RES-03 | 브랜드 에셋 폐기 | Manager, System | live 상태의 BrandAssetVersion, 폐기 사유, 대체 에셋 | Manager가 폐기하면 System이 BrandAssetVersion을 archived 상태로 변경하고 대체 에셋을 연결합니다. | Archived BrandAsset | BrandAssetVersion, VersionReason, BrandAssetDeprecated | Official Version 전환 |
| RES-04 | 템플릿 등록 | Manager, System | 템플릿 이름, 설명, Figma 노드 또는 템플릿 파일 참조 | Manager가 템플릿 정보를 입력하면 System이 Template과 TemplateSourceRef를 draft 상태로 저장합니다. | Draft Template | Template, TemplateSourceRef, TemplateRegistered | 템플릿 편집 구조 정의 |
| RES-05 | 템플릿 편집 구조 정의 | Manager, System | 템플릿, 레이아웃, 텍스트 스타일, 편집 가능 블록 | Manager가 제작 가능한 구조를 정의하면 System이 LayoutSpec, TextStyleSpec, EditableBlockSpec을 Template에 저장합니다. | Template Editable Structure | LayoutSpec, TextStyleSpec, EditableBlockSpec, TemplateRegistered | 템플릿 사용 조건 정의 |
| RES-06 | 템플릿 사용 조건 정의 | Manager, System | 템플릿, 어플리케이션 타입, 허용 조건, 제한 조건 | Manager가 사용 조건을 입력하면 System이 TemplateUsageCondition을 저장합니다. | Template Usage Condition | TemplateUsageCondition, TemplateRegistered | 템플릿과 규칙 연결 |
| RES-07 | 템플릿과 어플리케이션 타입 연결 | Manager, System | Template, ApplicationType | Manager가 사용 가능한 산출물 유형을 선택하면 System이 Template의 적용 범위를 저장합니다. | Application Template Link | TemplateUsageCondition, ResourceLinkedToGuideline | 템플릿 발행 |
| RES-08 | 템플릿과 규칙 연결 | Manager, System | Template, BrandRule | Manager가 템플릿에 적용할 규칙을 선택하면 System이 TemplateVersionRef와 BrandRuleVersionRef를 저장합니다. | Template Rule Link | TemplateVersionRef, BrandRuleVersionRef, ResourceLinkedToGuideline | 템플릿 발행 |
| RES-09 | 템플릿과 에셋 연결 | Manager, System | Template, BrandAssetVersion | Manager가 템플릿에 필요한 공식 에셋을 선택하면 System이 TemplateVersionRef와 BrandAssetVersionRef를 저장합니다. | Template Asset Link | TemplateVersionRef, BrandAssetVersionRef, ResourceLinkedToGuideline | 템플릿 미리보기 확인 |
| RES-10 | 템플릿 구조 확인 | Manager, System | Template, 샘플 입력값 | System이 EditableBlockSpec과 샘플 입력값으로 제작 구조를 확인하고 Manager가 결과를 확인합니다. | Template Structure Check | - | 템플릿 발행 |
| RES-11 | 템플릿 발행 | Manager, System | Draft Template, 적용 시작일 | Manager가 발행하면 System이 TemplateVersion을 live 상태로 전환합니다. | Live Template | TemplateVersion, TemplateUsageCondition, TemplatePublished | 템플릿 선택 |
| RES-12 | 템플릿 예약 발행 | Manager, System | Draft Template, 예약 적용일 | Manager가 적용일을 예약하면 System이 stage 상태의 TemplateVersion과 예약 적용일을 저장합니다. | Scheduled Template | TemplateVersion, EffectivePeriod, TemplateVersionStaged | live 전환 |
| RES-13 | 템플릿 폐기 | Manager, System | live 상태의 TemplateVersion, 폐기 사유, 대체 템플릿 | Manager가 폐기하면 System이 TemplateVersion을 archived 상태로 변경합니다. | Archived Template | TemplateVersion, VersionReason, TemplateDeprecated | Official Version 전환 |
| RES-14 | 플러그인 등록 | Manager, System | 플러그인 이름, 설명, 유형 | Manager가 플러그인 정보를 입력하면 System이 Plugin을 draft 상태로 저장합니다. | Draft Plugin | Plugin, PluginType, PluginRegistered | 플러그인 기능 정의 |
| RES-15 | 플러그인 실행 단위 정의 | Manager, System | Plugin, 실행 엔트리, 호출 방식 | Manager가 실행 단위를 입력하면 System이 PluginEntry를 Plugin에 추가합니다. | PluginEntry | PluginEntry, PluginRegistered | 플러그인 기능 정의 |
| RES-16 | 플러그인 기능 정의 | Manager, System | Plugin, 기능 이름, 기능 설명 | Manager가 제공 기능을 정의하면 System이 PluginCapability를 Plugin에 추가합니다. | PluginCapability | PluginCapability, PluginRegistered | 플러그인 입력 스키마 정의 |
| RES-17 | 플러그인 입력 스키마 정의 | Manager, System | PluginCapability, 입력 필드, 필수 여부 | Manager가 입력 스키마를 정의하면 System이 Plugin 실행 입력 조건을 저장합니다. | Plugin Input Schema | PluginCapability, PluginUsageCondition, PluginRegistered | 플러그인 출력 형식 정의 |
| RES-18 | 플러그인 출력 형식 정의 | Manager, System | PluginCapability, 출력 타입, 결과 형식 | Manager가 출력 형식을 정의하면 System이 AssetGenerationOutput에 반영 가능한 결과 타입을 저장합니다. | Plugin Output Schema | PluginCapability, PluginUsageCondition, PluginRegistered | 플러그인 사용 조건 정의 |
| RES-19 | 플러그인 사용 조건 정의 | Manager, System | Plugin, 어플리케이션 타입, 허용 조건, 제한 조건 | Manager가 사용 조건을 입력하면 System이 PluginUsageCondition을 저장합니다. | Plugin Usage Condition | PluginUsageCondition, PluginRegistered | 플러그인과 규칙 연결 |
| RES-20 | 플러그인과 어플리케이션 타입 연결 | Manager, System | Plugin, ApplicationType | Manager가 사용 가능한 산출물 유형을 선택하면 System이 Plugin의 적용 범위를 저장합니다. | Application Plugin Link | PluginUsageCondition, ResourceLinkedToGuideline | 플러그인 발행 |
| RES-21 | 플러그인과 규칙 연결 | Manager, System | Plugin, BrandRule | Manager가 플러그인 사용에 필요한 규칙을 선택하면 System이 PluginVersionRef와 BrandRuleVersionRef를 저장합니다. | Plugin Rule Link | PluginVersionRef, BrandRuleVersionRef, ResourceLinkedToGuideline | 플러그인 테스트 실행 |
| RES-22 | 플러그인과 템플릿 연결 | Manager, System | Plugin, Template | Manager가 함께 사용할 템플릿을 선택하면 System이 Plugin과 Template 참조를 저장합니다. | Plugin Template Link | PluginVersionRef, TemplateVersionRef, ResourceLinkedToGuideline | 플러그인 테스트 실행 |
| RES-23 | 플러그인 테스트 실행 | Manager, System, Agent | Plugin, 샘플 입력값 | System이 샘플 입력으로 Plugin을 실행하고 AgentRunRef와 테스트 결과를 기록합니다. | Plugin Test Result | AgentRunRef, PluginCapability, PluginVersion | 플러그인 발행 |
| RES-24 | 플러그인 발행 | Manager, System | Draft Plugin, 적용 시작일 | Manager가 발행하면 System이 PluginVersion을 live 상태로 전환합니다. | Live Plugin | PluginVersion, PluginUsageCondition, PluginPublished | 플러그인 선택 |
| RES-25 | 플러그인 예약 발행 | Manager, System | Draft Plugin, 예약 적용일 | Manager가 적용일을 예약하면 System이 stage 상태의 PluginVersion과 예약 적용일을 저장합니다. | Scheduled Plugin | PluginVersion, EffectivePeriod, PluginVersionStaged | live 전환 |
| RES-26 | 플러그인 폐기 | Manager, System | live 상태의 PluginVersion, 폐기 사유, 대체 플러그인 | Manager가 폐기하면 System이 PluginVersion을 archived 상태로 변경합니다. | Archived Plugin | PluginVersion, VersionReason, PluginDeprecated | Official Version 전환 |

#### Official Version 전환

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VER-01 | stage 상태의 Official Version 생성 | Manager, System | 발행 대상, Payload revision, VersionReason | System이 대상에 맞는 Official Version을 stage 상태로 생성합니다. | Stage Official Version | BrandGuidelineVersion, RuleCheckerVersion, BrandRuleVersion, BrandAssetVersion, TemplateVersion, PluginVersion, PayloadRevisionRef, VersionReason, GuidelineVersionStaged, RuleCheckerVersionStaged, BrandRuleVersionStaged, BrandAssetVersionStaged, TemplateVersionStaged, PluginVersionStaged | Official Version 차이 확인 |
| VER-02 | Official Version 차이 확인 | Manager, System | stage 상태의 Official Version, 이전 live 상태의 Official Version | Manager가 Payload revision 기반 diff로 이전 live 상태와 차이를 확인합니다. | Version Diff | - | live 전환 |
| VER-03 | live 전환 | Manager, System | stage 상태의 Official Version, 적용 시작일 | Manager가 발행하면 System이 Official Version을 live 상태로 전환하고 기존 live 상태의 Official Version을 archived 상태로 바꿉니다. | Live Official Version | VersionStatus, EffectivePeriod, GuidelineVersionPublished, RuleCheckerVersionPublished, BrandRuleVersionPublished, BrandAssetVersionPublished, TemplateVersionPublished, PluginVersionPublished | Official Version 보관 |
| VER-04 | Official Version 보관 | System | 기존 live 상태의 Official Version, 대체 Official Version | System이 대체된 Official Version을 archived 상태로 전환합니다. | Archived Official Version | VersionStatus, GuidelineVersionArchived, RuleCheckerVersionArchived, BrandRuleVersionArchived, BrandAssetVersionArchived, TemplateVersionArchived, PluginVersionArchived | - |

### 5.2 제작 관리

현재 제작 관리는 Creator가 발행된 Template과 Plugin을 사용해 요청 범위에서 결과를 생성합니다.
`AssetGenerationSession`과 `AssetGenerationOutput`은 저장하지 않습니다. 프로파일 기반 Image 결과 파일과 실행 조건만 별도 `GeneratedImage`로 저장합니다.
검수 요청과 Agent/System 판정은 품질 검수가 담당합니다.

#### 산출물 제작 기록(계획)

아래 유즈케이스는 향후 제작 사용량 추적을 도입할 때 적용합니다. 현재 Create와 Image 기능의 구현 요구사항이 아닙니다.

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GEN-01 | 에셋 제너레이션 시작 | Creator, System | 제작 목적, 사용자, 브랜드 | Creator가 에셋 제너레이션을 시작하면 System이 AssetGenerationSession을 만들고 사용할 ResourceRef를 저장합니다. | AssetGenerationSession | AssetGenerationSession, AssetGenerationPurpose, ResourceRef, AssetGenerationSessionStarted | 어플리케이션 타입 선택 |
| GEN-02 | 어플리케이션 타입 선택 | Creator, System | AssetGenerationSession, ApplicationType | Creator가 산출물 유형을 선택하면 System이 AssetGenerationSession에 ApplicationTypeRef를 저장합니다. | Selected ApplicationType | ApplicationTypeRef, AssetGenerationInputChanged | 템플릿 선택 |
| GEN-03 | 템플릿 선택 | Creator, System | AssetGenerationSession, ResourceRef | Creator가 템플릿을 선택하면 System이 ResourceRef를 AssetGenerationSession에 저장합니다. | Selected Template | ResourceRef, AssetGenerationInputChanged | 플러그인 선택 |
| GEN-04 | 플러그인 선택 | Creator, System | AssetGenerationSession, ResourceRef | Creator가 플러그인을 선택하면 System이 ResourceRef를 AssetGenerationSession에 저장합니다. | Selected Plugin | ResourceRef, AssetGenerationInputChanged | 브랜드 에셋 선택 |
| GEN-05 | 브랜드 에셋 선택 | Creator, System | AssetGenerationSession, ResourceRef | Creator가 사용할 공식 에셋을 선택하면 System이 ResourceRef를 AssetGenerationSession에 저장합니다. | Selected BrandAsset | ResourceRef, AssetGenerationInputChanged | 제작 입력값 작성 |
| GEN-06 | 제작 입력값 작성 | Creator, System | AssetGenerationSession, 텍스트, 이미지, 선택값 | Creator가 템플릿이나 플러그인 입력값을 작성하면 System이 AssetGenerationInput을 저장합니다. | AssetGenerationInput | AssetGenerationInput, AssetGenerationInputChanged | 미리보기 생성 |
| GEN-07 | 제작 입력값 수정 | Creator, System | AssetGenerationSession, 변경 입력값 | Creator가 입력값을 수정하면 System이 AssetGenerationInput을 갱신합니다. | Updated AssetGenerationInput | AssetGenerationInput, AssetGenerationInputChanged | 미리보기 생성 |
| GEN-08 | 미리보기 생성 | Creator, System | AssetGenerationInput, ResourceRef | System이 입력값과 선택한 자원을 조합해 산출물 미리보기를 생성합니다. | Preview | AssetGenerationPreviewGenerated | 산출물 생성 |
| GEN-09 | 산출물 생성 | Creator, System | AssetGenerationSession, 확정 입력값, 미리보기 | Creator가 생성을 요청하면 System이 AssetGenerationOutput을 생성합니다. | AssetGenerationOutput | AssetGenerationOutput, AssetGenerationOutputCreated | 산출물 저장 |
| GEN-10 | 산출물 저장 | Creator, System | AssetGenerationOutput, 저장 위치 | System이 AssetGenerationOutput을 저장하고 이후 검수에서 참조할 수 있게 보존합니다. | Saved AssetGenerationOutput | AssetGenerationOutput, AssetGenerationOutputCreated | 에셋 제너레이션 완료 |
| GEN-11 | 에셋 제너레이션 완료 | Creator, System | AssetGenerationSession, AssetGenerationOutput | Creator가 완료를 선택하면 System이 AssetGenerationStatus를 completed로 변경합니다. | Completed AssetGenerationSession | AssetGenerationStatus, AssetGenerationSessionCompleted | 검수 세션 시작 |

### 5.3 품질 검수

품질 검수는 CheckInputSnapshot에 고정된 이미지 입력을 대상으로 Agent/System 점검과 최종 판정을 수행합니다.
Agent 자체는 도메인 애그리거트가 아니며 결과에 `AgentRunRef`만 남깁니다.

Agent 채팅은 별도 `AgentChatSession`으로 대화와 사용량을 기록합니다.
기존 문서에서 `QASession`이라고 표기했던 품질 세션은 `CheckSession`으로 통일합니다. `AgentChatSession`은 이를 구현한 모델이 아닙니다.
채팅에서 검수 도구를 실행하면 생성된 `CheckSession`이 `AgentChatSession`을 출처로 선택 참조합니다.

#### 산출물 검수

아래 `CheckTarget`, `CheckRun`, `CheckBasis`, `CheckDecision`은 도메인 역할을 설명하는 이름입니다. 현재 저장 모델은 해당 값을 `CheckSession`에 평탄화합니다.

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QC-01 | 검수 세션 시작 | Creator, System | 업로드 이미지 | Creator가 검수를 요청하면 System이 이미지 지문을 CheckInputSnapshot으로 고정한 뒤 CheckSession을 시작합니다. | CheckSession | CheckInputSnapshot, CheckSession, CheckSessionStarted | 점검 실행 |
| QC-02 | 점검 실행 | System, Agent | CheckSession, CheckTarget, ResourceRef | System이 ResourceRef에서 검수에 필요한 VersionRef를 추출해 CheckBasis로 묶고 Agent가 해당 기준으로 산출물을 검사합니다. | CheckRun | CheckRun, CheckBasis, GuidelineVersionRef, BrandRuleVersionRef, BrandAssetVersionRef, AgentRunRef | 규칙 위반 확인 |
| QC-03 | 규칙 위반 확인 | System, Agent | CheckRun, CheckBasis, CheckTarget | System이 CheckBasis 기준으로 위반 항목을 정리하고 Agent가 설명 가능한 위반 내용을 보강합니다. | Violation List | CheckDecision, CheckResult, Violation, CheckRunCompleted | Agent 추천 생성 |
| QC-04 | Agent 추천 생성 | Agent, System | CheckResult, Violation, CheckTarget | Agent가 위반 항목별 수정 방향을 생성하고 System이 CheckResult 아래에 CheckRecommendation으로 저장합니다. | CheckRecommendation | CheckRecommendation, AgentRunRef | 검수 판정 기록 |
| QC-05 | 검수 판정 기록 | System, Agent | CheckSession, CheckRun, CheckDecision, CheckResult, CheckRecommendation | System이 CheckDecision 아래의 점검 결과와 추천을 종합해 CheckOutcome을 저장하고 CheckSession을 완료합니다. | Completed CheckSession | CheckOutcome, CheckCompleted | 점검 이력 조회 |

### 5.4 사용 기록

사용 기록은 에셋 제너레이션 기록, 품질 검수 기록, 화면 행동 기록을 조회하는 지원 서브도메인입니다.
운영자가 제품 사용 기록을 확인하기 위해 읽습니다.

#### 사용 기록

| ID | 유즈케이스 | 액터 | 입력 | 프로세스 | 아웃풋 | 생성 데이터 | 다음 연결 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LOG-01 | 사용 이력 조회 | Manager, System | 사용자 또는 기간, 조회 범위 | Manager가 조건을 입력하면 System이 AgentChatSession, CheckSession, BehaviorEventLog를 조합해 보여줍니다. | Usage History | AgentChatSession, CheckSession, BehaviorEventLog | - |
| LOG-02 | 에셋 제너레이션 기록 조회(계획) | Manager, System | AssetGenerationSession, 기간 | 향후 사용량 추적을 도입하면 System이 제작 기능과 ResourceRef 사용 이력을 보여줍니다. | Asset Generation History | AssetGenerationSession | 제작 사용량 확인 |
| LOG-03 | Agent 채팅 사용량 조회 | Manager, System | 사용자, 기간, 도구 또는 스킬 | Manager가 조건을 입력하면 System이 AgentChatSession의 대화 상태, 도구·스킬 사용과 AI 사용량을 보여줍니다. | Agent Chat Usage | AgentChatSession | Agent 품질 확인 |
| LOG-04 | 점검 이력 조회 | Manager, System | 사용자, 기간 | Manager가 조건을 입력하면 System이 CheckSession의 입력 지문, ruleset snapshot, 상태와 결과를 보여줍니다. | Check History | CheckSession | - |
| LOG-05 | 검수 입력 기록 조회 | Manager, System | 사용자, 기간 | Manager가 조건을 입력하면 System이 업로드 이미지 지문으로 생성된 CheckInputSnapshot 목록을 보여줍니다. | CheckInputSnapshot List | CheckInputSnapshot | 점검 이력 조회 |
| LOG-06 | 화면 행동 기록 조회 | Manager, System | 기간, 화면, 이벤트 이름, 공통 이벤트 속성 | Manager가 조건을 입력하면 System이 페이지 조회, 클릭, 검색, 구간 체류, 에셋 다운로드, 외부 링크 클릭 흐름을 보여줍니다. | Behavior Event Log | BehaviorEventLog, PageViewEvent, ClickEvent, SearchEvent, AssetDownloadEvent, SectionDwellEvent, OutboundLinkEvent, CustomEvent | - |
