# Plan: web-brainstorm

> 작성일: 2026-03-09
> 상태: Draft v1.0
> 참조: brainstorm-skill.plan.md, brainstorm.md (스킬)

---

## 1. 한 줄 목표

웹앱에서 Anthropic API로 PHVI 브레인스토밍 대화를 하며, 실시간으로 마인드맵이 그려지는 기능을 구현한다.

---

## 2. 문제 정의

| 기존 상태 | 해결 방향 |
|----------|----------|
| /brainstorm은 CLI에서만 동작 | 웹 UI로 동일 대화 경험 제공 |
| 대화 중 마인드맵 구조를 볼 수 없음 (완료 후에만) | 대화하며 노드가 실시간 추가되는 시각적 피드백 |
| Claude Code 설치 필수 | 브라우저만으로 접근 가능 |
| 문서 생성(SPEC/PRD/TASKS)은 CLI 도구 의존 | 범위 제외 — 마인드맵 생성만 집중 |

---

## 3. 범위 결정

### In Scope (마인드맵 중심)
- [ ] Anthropic API 프록시 (Vercel Edge Function)
- [ ] 채팅 UI (대화 패널)
- [ ] PHVI 사이클 기반 시스템 프롬프트
- [ ] 대화에서 노드 자동 추출 → 실시간 마인드맵 렌더링
- [ ] PHVI 단계 표시기 (현재 P/H/V/I 어디인지)
- [ ] 완료 시 mindmap.json 다운로드 (기존 뷰어와 호환)
- [ ] 라우팅: `/brainstorm` 페이지 추가

### Out of Scope
- 문서 생성 (SPEC.md, PRD.md, TASKS.md)
- 프로젝트 저장/목록 관리 (DB 불필요)
- 사용자 인증
- 대화 히스토리 영구 저장

---

## 4. 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  Browser (기존 viewer React 앱)                      │
│                                                     │
│  BrainstormPage                                     │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │  ChatPanel    │    │  MindmapCanvas (기존)    │    │
│  │  - 메시지 목록 │    │  - computeGroupLayout   │    │
│  │  - 입력 폼    │    │  - 실시간 노드 추가      │    │
│  │  - 단계 표시  │    │  - 카테고리별 색상       │    │
│  └──────┬───────┘    └──────────┬──────────────┘    │
│         │                       │                    │
│         └───── useBrainstormStore (Zustand) ─────────┘
│                       │                              │
└───────────────────────┼──────────────────────────────┘
                        │ POST /api/chat (streaming)
                        ▼
┌─────────────────────────────────────────────────────┐
│  Vercel Edge Function  /api/chat                     │
│                                                     │
│  - ANTHROPIC_API_KEY (환경변수)                      │
│  - 시스템 프롬프트: PHVI 규칙 + JSON 노드 추출 규칙   │
│  - 스트리밍 응답 (ReadableStream)                    │
│  - 응답 형식: 대화 텍스트 + 노드 데이터 분리          │
└─────────────────────────────────────────────────────┘
```

---

## 5. Claude 응답 형식 설계

### 핵심 과제: 대화 텍스트와 노드 데이터를 분리

Claude에게 응답 끝에 구조화된 노드 블록을 출력하도록 지시:

```
[대화 텍스트]
부동산 업계에서 매물 관리의 주요 과제는...
어떤 부분이 가장 불편하신가요?

---NODES---
[{"id":"n1","label":"매물 관리 비효율","description":"수기 입력과 중복 등록 문제","category":"문제정의","parentId":null}]
---ENDNODES---
```

### 프론트엔드 파싱 전략
1. 스트리밍 중에는 텍스트만 채팅에 표시
2. `---NODES---` 마커 감지 시 JSON 파싱
3. 파싱된 노드를 useBrainstormStore에 추가
4. MindmapCanvas가 노드 변경 감지 → 재레이아웃 + 애니메이션

---

## 6. 시스템 프롬프트 설계

기존 `brainstorm.md` 스킬에서 변환:

| 스킬 규칙 | API 프롬프트 변환 |
|----------|-----------------|
| 한 번에 질문 1개 | 유지 |
| 전문가 페르소나 자동 설정 | 유지 |
| PHVI 사이클 따르기 | 유지 |
| 답변마다 노드 추출 | `---NODES---` 블록으로 구조화 |
| 매 3라운드 트리 표시 | 제거 (웹에서 실시간 시각화되므로 불필요) |
| 파일 생성 (6단계) | 제거 (Out of Scope) |
| 마무리 확인 (5단계) | 유지 — "마무리할까요?" 제안 |

### 추가 규칙
- 응답에 현재 `round`와 `phase` 메타데이터 포함
- 노드 `id`는 `n1`, `n2`... 순번 유지
- 이전 대화의 노드 목록을 컨텍스트로 전달하여 중복 방지

---

## 7. 기술 스택 (추가분)

| 역할 | 기술 | 비고 |
|------|------|------|
| API 프록시 | Vercel Edge Function | `viewer/api/chat.ts` |
| AI SDK | `@anthropic-ai/sdk` | Edge Function에서만 사용 |
| 스트리밍 파싱 | 네이티브 ReadableStream | 추가 라이브러리 불필요 |
| 상태 관리 | Zustand (기존) | `useBrainstormStore` 추가 |
| 마인드맵 | @xyflow/react (기존) | MindmapCanvas 재사용 |
| 레이아웃 | computeGroupLayout (기존) | 그대로 재사용 |

---

## 8. 파일 구조 (변경분)

```
viewer/
├── api/
│   └── chat.ts                    ← [신규] Vercel Edge Function
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx      ← [신규] 채팅 UI
│   │   │   ├── ChatMessage.tsx    ← [신규] 메시지 버블
│   │   │   └── PhaseIndicator.tsx ← [신규] PHVI 단계 바
│   │   ├── pages/
│   │   │   └── BrainstormPage.tsx ← [신규] 채팅+마인드맵 2분할
│   │   ├── MindmapCanvas.tsx      ← [수정] 외부 노드 주입 지원
│   │   └── ...기존 파일 유지
│   ├── stores/
│   │   └── useBrainstormStore.ts  ← [신규] 대화+노드 상태
│   ├── lib/
│   │   └── brainstormPrompt.ts    ← [신규] 시스템 프롬프트
│   └── App.tsx                    ← [수정] /brainstorm 라우트 추가
```

---

## 9. 기존 자산 재사용 분석

| 기존 자산 | 재사용 가능 여부 | 수정 필요 |
|----------|:---------------:|----------|
| `MindmapCanvas.tsx` | O | 외부 노드 props 수신 모드 추가 |
| `MindmapNode.tsx` | O | 변경 없음 |
| `GroupNode.tsx` | O | 변경 없음 |
| `CategoryNav.tsx` | O | 변경 없음 |
| `DetailPanel.tsx` | O | 변경 없음 |
| `computeGroupLayout()` | O | 변경 없음 |
| `lib/types.ts` | O | BrainstormMessage 타입 추가 |
| `useThemeStore` | O | 변경 없음 |
| `CATEGORY_COLORS` | O | 변경 없음 |

**재사용률: ~80%** — 마인드맵 렌더링 관련 코드는 전부 재사용.

---

## 10. 구현 순서

| 순서 | 작업 | 예상 복잡도 | 의존성 |
|:----:|------|:----------:|--------|
| 1 | `brainstormPrompt.ts` — 시스템 프롬프트 작성 | 낮음 | 없음 |
| 2 | `api/chat.ts` — Edge Function (API 프록시 + 스트리밍) | 중 | 1 |
| 3 | `useBrainstormStore.ts` — 상태 관리 | 중 | 없음 |
| 4 | `ChatPanel.tsx` + `ChatMessage.tsx` — 채팅 UI | 중 | 3 |
| 5 | `MindmapCanvas.tsx` 수정 — 외부 노드 주입 모드 | 낮음 | 없음 |
| 6 | `BrainstormPage.tsx` — 2분할 레이아웃 조립 | 중 | 4, 5 |
| 7 | `PhaseIndicator.tsx` — 단계 표시기 | 낮음 | 3 |
| 8 | `App.tsx` 라우팅 추가 + 네비게이션 연결 | 낮음 | 6 |
| 9 | JSON 다운로드 기능 | 낮음 | 3 |

---

## 11. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| API 비용 | 대화마다 Claude API 호출 비용 발생 | 라운드 상한(20) 유지, 토큰 사용량 표시 |
| 노드 파싱 실패 | `---NODES---` 마커를 Claude가 누락할 수 있음 | 파싱 실패 시 텍스트만 표시, 다음 턴에 재시도 |
| API 키 노출 | 프론트엔드에서 키가 보이면 보안 문제 | Edge Function에서만 사용, 환경변수로 관리 |
| 마인드맵 성능 | 노드 20개+ 실시간 재레이아웃 부하 | 이미 검증됨 (기존 뷰어가 처리) |

---

## 12. 성공 기준

- [ ] `/brainstorm` 접속 → 채팅 시작 → 노드가 실시간으로 마인드맵에 나타남
- [ ] PHVI 4단계가 자연스럽게 진행됨
- [ ] 완료 시 mindmap.json 다운로드 → 기존 뷰어에서 열림
- [ ] 모바일 반응형 동작
- [ ] API 키가 브라우저에 노출되지 않음

---

## 13. 비범위 확인 (명시적 제외)

- SPEC.md / PRD.md / TASKS.md 문서 생성
- 프로젝트 목록 자동 등록 (`index.json` 업데이트)
- 대화 히스토리 저장/불러오기
- 사용자 인증/과금
