# Design: web-brainstorm

> 작성일: 2026-03-09
> 상태: Draft v1.0
> Plan 참조: docs/01-plan/features/web-brainstorm.plan.md

---

## 1. 컴포넌트 설계

### 1.1 페이지 구조

```
App.tsx
└── /brainstorm 라우트 (AppLayout 밖, 독립 레이아웃)
    └── BrainstormPage.tsx
        ├── ChatPanel (좌측 또는 모바일 전체)
        │   ├── PhaseIndicator
        │   ├── ChatMessage[] (메시지 목록)
        │   └── ChatInput (입력 폼)
        └── MindmapCanvas (우측, 기존 컴포넌트 재사용)
            ├── MindmapNode (기존)
            ├── GroupNode (기존)
            ├── DetailPanel (기존)
            └── CategoryNav (기존)
```

### 1.2 라우팅 변경

```typescript
// App.tsx 변경
<Routes>
  {/* 기존 뷰어 라우트 */}
  <Route element={<AppLayout />}>
    <Route index element={<WelcomePage />} />
    <Route path=":slug">...</Route>
  </Route>

  {/* 브레인스토밍 (독립 레이아웃 — 사이드바 없음) */}
  <Route path="brainstorm" element={<BrainstormPage />} />
</Routes>
```

**독립 레이아웃인 이유:** 브레인스토밍 페이지는 채팅+마인드맵 2분할이 전체 화면을 차지해야 하므로, 기존 Sidebar/Header 레이아웃과 분리.

---

## 2. 신규 파일 상세 설계

### 2.1 `viewer/api/chat.ts` — Vercel Edge Function

```typescript
// Vercel Edge Function
// POST /api/chat
// Body: { messages: ChatMessage[], nodes: MindmapNode[] }
// Response: ReadableStream (text/event-stream)

export const config = { runtime: 'edge' }

interface RequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[]
  nodes: MindmapNode[]  // 현재까지 추출된 노드 (컨텍스트 전달)
}
```

**역할:**
1. `ANTHROPIC_API_KEY` 환경변수에서 키 로드
2. 시스템 프롬프트 구성 (PHVI 규칙 + 현재 노드 목록)
3. Anthropic Messages API 호출 (stream: true)
4. SSE 형식으로 클라이언트에 스트리밍 전달

**시스템 프롬프트 구성:**
```
[고정 부분] brainstormPrompt.ts에서 가져온 PHVI 규칙
[동적 부분] 현재 노드 목록 JSON (중복 방지용)
[동적 부분] 현재 라운드 수
```

**보안:**
- API 키는 Vercel 환경변수 (`ANTHROPIC_API_KEY`)에서만 로드
- 클라이언트에 절대 노출 안 됨
- CORS: 같은 도메인이므로 별도 설정 불필요

---

### 2.2 `viewer/src/lib/brainstormPrompt.ts` — 시스템 프롬프트

```typescript
export function buildSystemPrompt(existingNodes: MindmapNode[], round: number): string
```

**프롬프트 핵심 규칙:**
1. PHVI 사이클 기반 질문 흐름 (brainstorm.md에서 변환)
2. 한 번에 질문 1개
3. 전문가 페르소나 자동 설정
4. 매 응답 끝에 노드 블록 출력

**응답 형식 지시:**

```
당신의 모든 응답은 다음 형식을 따릅니다:

[대화 텍스트 — 사용자에게 보여줄 내용]

---NODES---
{"round":N,"phase":"P|H|V|I","nodes":[...]}
---ENDNODES---

nodes 배열의 각 요소:
- id: "nN" (기존 노드 이후 순번)
- label: 10자 이내 핵심 키워드
- description: 2-3문장 설명
- category: "문제정의"|"가설"|"검증"|"개선"|"사용자"|"경쟁사"|"위험요소"|"기술"
- parentId: 논리적 부모 노드 id 또는 null

이번 턴에서 새로 추출할 노드가 없으면 빈 배열 []을 사용하세요.
절대로 ---NODES--- 블록을 생략하지 마세요.
```

---

### 2.3 `viewer/src/stores/useBrainstormStore.ts` — 상태 관리

```typescript
import { create } from 'zustand'
import type { MindmapNode } from '../lib/types'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string       // 대화 텍스트 (노드 블록 제외)
  timestamp: number
}

interface BrainstormState {
  // 대화 상태
  messages: ChatMessage[]
  isStreaming: boolean
  streamingContent: string  // 스트리밍 중 축적되는 텍스트

  // 마인드맵 상태
  nodes: MindmapNode[]
  projectName: string

  // PHVI 메타데이터
  round: number
  phase: 'P' | 'H' | 'V' | 'I'

  // 액션
  addUserMessage: (content: string) => void
  startStreaming: () => void
  appendStreamChunk: (chunk: string) => void
  finishStreaming: (fullText: string) => void
  addNodes: (newNodes: MindmapNode[]) => void
  updatePhase: (round: number, phase: 'P' | 'H' | 'V' | 'I') => void
  setProjectName: (name: string) => void
  reset: () => void
}
```

**핵심 로직:**

`finishStreaming` 시:
1. `---NODES---` ~ `---ENDNODES---` 사이 JSON 파싱
2. 파싱 성공 → `addNodes` 호출 + `updatePhase` 호출
3. 파싱 실패 → 노드 추가 없이 대화만 저장 (에러 무시)
4. 대화 텍스트에서 노드 블록 제거 후 `ChatMessage`로 저장

---

### 2.4 `viewer/src/components/chat/ChatPanel.tsx` — 채팅 UI

```
┌──────────────────────────┐
│  PhaseIndicator          │  ← PHVI 단계 + 라운드
├──────────────────────────┤
│                          │
│  ChatMessage (assistant) │  ← 스크롤 가능
│  ChatMessage (user)      │
│  ChatMessage (assistant) │
│  ... (자동 스크롤)        │
│                          │
│  StreamingIndicator      │  ← 스트리밍 중 표시
│                          │
├──────────────────────────┤
│  ┌──────────────────┐ ▶  │  ← 입력 폼 + 전송 버튼
│  └──────────────────┘    │
└──────────────────────────┘
```

**Props:**
```typescript
interface ChatPanelProps {
  // props 없음 — useBrainstormStore에서 직접 구독
}
```

**동작:**
1. 메시지 입력 → `addUserMessage` → `/api/chat` POST
2. SSE 스트림 수신 → `appendStreamChunk` (실시간 텍스트 표시)
3. 스트림 완료 → `finishStreaming` (노드 파싱 + 저장)
4. 메시지 목록 하단 자동 스크롤

**API 호출 함수 (ChatPanel 내부):**
```typescript
async function sendMessage(userInput: string) {
  const { messages, nodes } = useBrainstormStore.getState()

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      nodes,
    }),
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  // 스트리밍 읽기 루프
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    useBrainstormStore.getState().appendStreamChunk(chunk)
  }

  useBrainstormStore.getState().finishStreaming(/* 축적된 전체 텍스트 */)
}
```

---

### 2.5 `viewer/src/components/chat/ChatMessage.tsx` — 메시지 버블

```typescript
interface ChatMessageProps {
  message: ChatMessage
}
```

**스타일:**
- `user`: 우측 정렬, 파란 배경
- `assistant`: 좌측 정렬, 회색 배경, 마크다운 렌더링 (react-markdown 재사용)

---

### 2.6 `viewer/src/components/chat/PhaseIndicator.tsx` — 단계 표시기

```
 ● 문제정의(P) → ○ 가설(H) → ○ 검증(V) → ○ 개선(I)    라운드 3/20
```

**Props:**
```typescript
interface PhaseIndicatorProps {
  currentPhase: 'P' | 'H' | 'V' | 'I'
  round: number
}
```

**스타일:**
- 현재 단계: 채워진 원(●) + 굵은 글씨 + CATEGORY_COLORS 매핑
- 미래 단계: 빈 원(○) + 흐린 글씨
- 완료 단계: 체크(✓) + 취소선 없이 밝은 색

---

### 2.7 `viewer/src/components/pages/BrainstormPage.tsx` — 2분할 페이지

```typescript
export default function BrainstormPage() {
  const { nodes, projectName } = useBrainstormStore()
  const mindmapData: MindmapData = {
    projectName: projectName || '브레인스토밍',
    createdAt: new Date().toISOString(),
    nodes,
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 (심플 — 로고 + 제목 + 다운로드 버튼) */}
      <BrainstormHeader />

      {/* 2분할 본문 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 채팅 */}
        <div className="w-[420px] shrink-0 border-r border-gray-200 dark:border-gray-800">
          <ChatPanel />
        </div>

        {/* 우측: 마인드맵 */}
        <div className="flex-1">
          <MindmapCanvas
            data={mindmapData}
            isPlaceholder={nodes.length === 0}
          />
        </div>
      </div>
    </div>
  )
}
```

**모바일 반응형:**
- `md` 이하: 탭 전환 (채팅 / 마인드맵)
- `md` 이상: 좌우 분할

---

## 3. MindmapCanvas 수정 사항

### 3.1 변경 최소화 원칙

MindmapCanvas는 이미 `data: MindmapData`를 props로 받으므로, **외부에서 노드를 주입하는 것이 자연스럽게 동작**합니다.

### 3.2 필요한 수정

```typescript
// 현재: data가 변경되어도 초기 포커스가 한 번만 실행
const initialFocusDone = useRef(false)

// 수정: 브레인스토밍 모드에서는 노드 추가 시 자동 fitView
interface Props {
  data: MindmapData
  isPlaceholder: boolean
  autoFit?: boolean  // [추가] true면 노드 변경마다 fitView
}
```

`autoFit` prop 추가:
- `false` (기본값): 기존 동작 유지 (초기 한 번만 fitView)
- `true`: `data.nodes.length` 변경 시 fitView 재실행 (브레인스토밍용)

```typescript
// 추가할 useEffect
useEffect(() => {
  if (!autoFit) return
  if (data.nodes.length === 0) return
  fitView({ padding: 0.15, duration: 400 })
}, [data.nodes.length, autoFit, fitView])
```

이 한 가지 수정 외에 MindmapCanvas의 기존 로직은 변경하지 않습니다.

---

## 4. 데이터 흐름 상세

```
사용자 입력
    │
    ▼
ChatPanel.sendMessage()
    │
    ├── useBrainstormStore.addUserMessage(content)
    │
    ├── POST /api/chat  ──────────────────────────────┐
    │   Body: { messages, nodes }                      │
    │                                                  ▼
    │                                        Vercel Edge Function
    │                                          │
    │                                          ├── 시스템 프롬프트 구성
    │                                          │   (PHVI 규칙 + 노드 목록)
    │                                          │
    │                                          ├── Anthropic Messages API
    │                                          │   stream: true
    │                                          │
    │                                          ▼
    │   ◄──── SSE 스트리밍 ────────────────────┘
    │
    ├── appendStreamChunk() × N  →  ChatPanel에 실시간 텍스트
    │
    ▼
finishStreaming()
    │
    ├── "---NODES---" 파싱
    │   ├── 성공 → addNodes([...]) → MindmapCanvas 자동 업데이트
    │   └── 실패 → 무시 (다음 턴에 재시도)
    │
    ├── updatePhase(round, phase)
    │
    └── ChatMessage 저장 (노드 블록 제거된 텍스트)
```

---

## 5. 노드 파싱 로직

```typescript
// lib/parseNodes.ts

interface ParsedResponse {
  text: string           // 대화 텍스트 (노드 블록 제거)
  nodes: MindmapNode[]   // 추출된 노드
  round: number
  phase: 'P' | 'H' | 'V' | 'I'
}

export function parseAssistantResponse(raw: string): ParsedResponse {
  const markerStart = '---NODES---'
  const markerEnd = '---ENDNODES---'

  const startIdx = raw.indexOf(markerStart)
  const endIdx = raw.indexOf(markerEnd)

  if (startIdx === -1 || endIdx === -1) {
    // 노드 블록 없음 → 텍스트만 반환
    return { text: raw.trim(), nodes: [], round: 0, phase: 'P' }
  }

  const text = raw.substring(0, startIdx).trim()
  const jsonStr = raw.substring(startIdx + markerStart.length, endIdx).trim()

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      text,
      nodes: parsed.nodes || [],
      round: parsed.round || 0,
      phase: parsed.phase || 'P',
    }
  } catch {
    return { text: raw.trim(), nodes: [], round: 0, phase: 'P' }
  }
}
```

---

## 6. JSON 다운로드 기능

```typescript
// BrainstormHeader 내부

function handleDownload() {
  const { nodes, projectName } = useBrainstormStore.getState()
  const data: MindmapData = {
    projectName,
    createdAt: new Date().toISOString(),
    nodes,
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mindmap-${projectName || 'brainstorm'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

다운로드된 JSON은 `viewer/public/projects/{slug}/mindmap.json`에 넣으면 기존 뷰어에서 열림.

---

## 7. Vercel 배포 설정 변경

### vercel.json 수정

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "/api/:path*" },
    { "source": "/((?!assets|projects|mindmap\\.json|vite\\.svg|api).*)", "destination": "/index.html" }
  ]
}
```

### 환경변수

```
ANTHROPIC_API_KEY=sk-ant-...  (Vercel Dashboard에서 설정)
```

---

## 8. 모바일 반응형 설계

### 데스크탑 (md 이상)

```
┌─────────────────────┬──────────────────────────┐
│  ChatPanel (420px)  │  MindmapCanvas (flex-1)  │
│  고정 너비           │  나머지 공간 차지          │
└─────────────────────┴──────────────────────────┘
```

### 모바일 (md 미만)

```
┌──────────────────────────┐
│  [💬 채팅] [🧠 마인드맵]  │  ← 탭 전환
├──────────────────────────┤
│                          │
│   현재 선택된 탭 내용      │
│   (전체 화면)             │
│                          │
└──────────────────────────┘
```

```typescript
// BrainstormPage 내부
const [mobileTab, setMobileTab] = useState<'chat' | 'map'>('chat')

// 노드 추가 시 마인드맵 탭에 뱃지 표시
const [newNodeCount, setNewNodeCount] = useState(0)
```

---

## 9. 에러 처리

| 상황 | 처리 |
|------|------|
| API 호출 실패 (네트워크) | "연결에 실패했습니다. 다시 시도해주세요." 토스트 |
| API 키 미설정 | Edge Function에서 401 반환 → "API 키가 설정되지 않았습니다." |
| 노드 파싱 실패 | 무시 — 대화만 정상 표시 |
| 스트리밍 중 연결 끊김 | 축적된 텍스트까지만 저장 |
| Rate limit | 429 → "잠시 후 다시 시도해주세요." |

---

## 10. 구현 순서 (의존성 기반)

```
1. brainstormPrompt.ts        ← 의존성 없음
2. lib/parseNodes.ts           ← 의존성 없음
   ─── 동시 가능 ───
3. api/chat.ts                 ← 1에 의존
4. useBrainstormStore.ts       ← 2에 의존
   ─── 동시 가능 ───
5. ChatMessage.tsx             ← 의존성 없음 (순수 UI)
6. PhaseIndicator.tsx          ← 의존성 없음 (순수 UI)
   ─── 동시 가능 ───
7. ChatPanel.tsx               ← 4, 5에 의존
8. MindmapCanvas.tsx 수정      ← autoFit prop 추가
   ─── 동시 가능 ───
9. BrainstormPage.tsx          ← 7, 8에 의존
10. App.tsx 라우팅 추가         ← 9에 의존
11. vercel.json 수정           ← 의존성 없음
12. 패키지 설치                 ← npm install @anthropic-ai/sdk
```

---

## 11. 테스트 체크리스트

- [ ] `/brainstorm` 접속 시 초기 화면 표시
- [ ] 첫 메시지 입력 → AI 응답 스트리밍 표시
- [ ] 응답 완료 후 노드가 마인드맵에 추가됨
- [ ] PHVI 단계 표시기가 라운드에 따라 업데이트
- [ ] 노드 클릭 시 DetailPanel 표시
- [ ] 모바일 탭 전환 동작
- [ ] JSON 다운로드 → 기존 뷰어에서 열림
- [ ] API 키 미설정 시 에러 메시지
- [ ] 스트리밍 중 추가 입력 방지 (isStreaming)
