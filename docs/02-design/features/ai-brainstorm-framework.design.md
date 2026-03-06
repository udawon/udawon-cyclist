# Design: AI 기반 프로젝트 프레임워크 브레인스토밍 시스템

> 참조: SPEC.md v1.0
> 작성일: 2026-03-06
> 상태: Draft v1.0

---

## 1. 아키텍처 개요

```
+------------------+       +------------------+       +------------------+
|   Next.js App    |  -->  |  API Routes      |  -->  |  Claude API      |
|  (App Router)    |       |  /api/chat        |       |  (Sonnet 4.6)    |
|                  |       |  /api/export      |       |                  |
+------------------+       +------------------+       +------------------+
        |
        v
+------------------+       +------------------+
|  Zustand Store   |  -->  |  React Flow      |
|  (상태관리)       |       |  (마인드맵 렌더링)|
+------------------+       +------------------+
```

### 레이어 책임

| 레이어 | 역할 |
|--------|------|
| Next.js App Router | 라우팅, SSR, 페이지 진입 |
| API Routes | Claude API 프록시, 내보내기 변환 로직 |
| Zustand Store | 대화 히스토리, 마인드맵 노드 상태 동기화 |
| React Flow | 노드 렌더링, 노드 간 엣지 드로잉 |
| Claude API | AI 인터뷰 응답, 노드 제안, 사각지대 분석 |

---

## 2. 페이지 구조

```
app/
  layout.tsx              -- 루트 레이아웃
  page.tsx                -- 랜딩 / 시작 화면
  session/
    page.tsx              -- 메인 브레인스토밍 세션 화면
  api/
    chat/
      route.ts            -- Claude API 스트리밍 엔드포인트
    export/
      route.ts            -- SPEC.md / PRD / Task 변환 엔드포인트
```

---

## 3. 핵심 화면 상세 설계

### 3.1 랜딩 화면 (`/`)

```
+--------------------------------------------------+
|                                                  |
|          [로고]  AI 브레인스토밍                  |
|                                                  |
|   프로젝트 이름을 입력해주세요                     |
|   +------------------------------------------+  |
|   | 예: 커머스 플랫폼, 팀 업무 관리 도구...    |  |
|   +------------------------------------------+  |
|                                                  |
|          [브레인스토밍 시작하기 ->]               |
|                                                  |
+--------------------------------------------------+
```

- 프로젝트 이름 입력 후 세션 시작
- 세션 ID 생성 후 `/session`으로 이동
- 세션은 브라우저 sessionStorage에 저장 (새로고침 유지)

---

### 3.2 메인 세션 화면 (`/session`)

```
+-----------------------------------------------------------+
|  [프로젝트명]                          [내보내기 ▼]       |
+---------------------------+-------------------------------+
|                           |                               |
|  AI 채팅 패널 (40%)       |   마인드맵 캔버스 (60%)       |
|                           |                               |
|  -- 대화 영역 --          |  [React Flow 캔버스]          |
|  AI: 첫 질문...           |                               |
|                           |   (노드들이 실시간으로 추가됨) |
|  나: ...                  |                               |
|                           |                               |
|  -- 노드 제안 카드 --      |                               |
|  +---------------------+  |                               |
|  | 제목: 핵심 문제      |  |                               |
|  | 내용: ...           |  |                               |
|  | [추가] [거절]       |  |                               |
|  +---------------------+  |                               |
|                           |                               |
|  [입력창              ]   |                               |
+---------------------------+-------------------------------+
```

**레이아웃 규칙**
- 모바일: 탭으로 전환 (채팅 탭 / 마인드맵 탭)
- 데스크톱: 좌우 분할 레이아웃
- 채팅 패널 최소 너비: 360px

---

## 4. 컴포넌트 구조

```
components/
  chat/
    ChatPanel.tsx           -- 채팅 패널 전체 컨테이너
    ChatMessage.tsx         -- 단일 메시지 (AI / 사용자)
    ChatInput.tsx           -- 입력창 + 전송 버튼
    NodeProposalCard.tsx    -- AI 노드 제안 카드 (승인/거절)
  mindmap/
    MindmapCanvas.tsx       -- React Flow 캔버스 래퍼
    MindmapNode.tsx         -- 커스텀 노드 컴포넌트
    MindmapEdge.tsx         -- 커스텀 엣지 (연결선)
  export/
    ExportDropdown.tsx      -- 내보내기 드롭다운 메뉴
  layout/
    Header.tsx              -- 상단 헤더
    SessionLayout.tsx       -- 좌우 분할 레이아웃
```

---

## 5. 데이터 모델

### MindmapNode

```typescript
interface MindmapNode {
  id: string;           // 고유 ID (uuid)
  label: string;        // 노드 제목 (키워드)
  description: string;  // 마이크로 설명 (2-3줄)
  parentId: string | null;  // 부모 노드 ID (null이면 루트)
  status: 'pending' | 'approved' | 'rejected';  // 승인 상태
  category?: string;    // 분류 (문제/해결책/위험/경쟁사 등)
  createdAt: number;    // 타임스탬프
}
```

### MindmapEdge

```typescript
interface MindmapEdge {
  id: string;
  source: string;       // 소스 노드 ID
  target: string;       // 타겟 노드 ID
  label?: string;       // 연결 관계 설명 (선택)
}
```

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  nodeProposal?: NodeProposal;  // AI가 제안하는 노드 (있을 때만)
  timestamp: number;
}

interface NodeProposal {
  node: Omit<MindmapNode, 'id' | 'status' | 'createdAt'>;
  proposedEdges?: Array<{ sourceId: string; label?: string }>;  // 연결 제안
}
```

### SessionState (Zustand)

```typescript
interface SessionState {
  projectName: string;
  messages: ChatMessage[];
  nodes: MindmapNode[];
  edges: MindmapEdge[];
  isStreaming: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  approveNode: (proposalId: string) => void;
  rejectNode: (proposalId: string) => void;
  exportDocument: (format: 'spec' | 'prd' | 'tasks') => Promise<string>;
}
```

---

## 6. API 설계

### POST `/api/chat`

Claude API와 스트리밍으로 통신하는 메인 엔드포인트.

**Request**
```typescript
{
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  projectName: string;
  currentNodes: MindmapNode[];  // 현재 마인드맵 상태 (컨텍스트 제공)
}
```

**Response** — Server-Sent Events (스트리밍)
```
data: {"type": "text", "delta": "안녕하세요..."}
data: {"type": "node_proposal", "node": { "label": "...", "description": "...", ... }}
data: {"type": "done"}
```

**Claude System Prompt 구조**
```
당신은 프로젝트 프레임워크 설계를 돕는 AI 공동 설계자입니다.

역할:
1. 질문으로 사용자의 아이디어를 이끌어냄
2. 답변을 바탕으로 마인드맵 노드를 제안함 (반드시 JSON 형식으로 제안)
3. 사용자가 놓친 위험 요소, 경쟁사, 사용자 시나리오를 능동적으로 지적
4. 노드 간 연결 관계를 발견해 제안
5. 브레인스토밍이 충분히 진행되면 MVP/Phase/Roadmap 구조 제안

노드 제안 규칙:
- 반드시 사용자 승인 전에는 마인드맵에 추가하지 않음
- 한 번에 1개 노드만 제안 (과부하 방지)
- JSON 블록으로 제안: ```node_proposal { ... } ```

현재 프로젝트: {projectName}
현재 노드 수: {nodeCount}
현재 노드 목록: {nodeList}
```

---

### POST `/api/export`

완성된 마인드맵을 문서로 변환.

**Request**
```typescript
{
  format: 'spec' | 'prd' | 'tasks';
  projectName: string;
  nodes: MindmapNode[];
  edges: MindmapEdge[];
}
```

**Response**
```typescript
{
  content: string;      // Markdown 또는 텍스트
  filename: string;     // 다운로드 파일명
}
```

---

## 7. 상태관리 흐름

```
사용자 메시지 입력
      |
sendMessage() 호출
      |
POST /api/chat (스트리밍)
      |
      +-- "text" 이벤트 --> ChatMessage 추가 (스트리밍 표시)
      |
      +-- "node_proposal" 이벤트 --> NodeProposalCard 표시
                |
                +-- [추가] 클릭 --> approveNode()
                |                   --> nodes 배열에 추가
                |                   --> React Flow 자동 리렌더링
                |
                +-- [거절] 클릭 --> rejectNode()
                                    --> 제안 카드만 제거
```

---

## 8. React Flow 마인드맵 설계

### 노드 레이아웃 알고리즘
- 라이브러리: `@xyflow/react` + `dagre` (자동 레이아웃)
- 방향: 루트에서 하향 트리 (Top-Down)
- 노드 추가 시 `dagre`로 자동 위치 재계산

### 커스텀 노드 (`MindmapNode.tsx`)
```
+-----------------------------+
|  [카테고리 뱃지]            |
|  제목 텍스트                 |
|  ─────────────────          |
|  • 설명 bullet 1            |
|  • 설명 bullet 2            |
|                    [+드릴다운]|
+-----------------------------+
```

### 카테고리별 노드 색상
| 카테고리 | 색상 |
|---------|------|
| 핵심 문제 | 파랑 |
| 해결책 | 초록 |
| 위험 요소 | 빨강 |
| 경쟁사 | 주황 |
| 사용자 | 보라 |
| 기술 | 회색 |

---

## 9. 내보내기 변환 로직

### SPEC.md 변환 규칙
- 루트 노드 -> 프로젝트 개요
- 카테고리 "핵심 문제" -> 문제 정의 섹션
- 카테고리 "해결책" -> 핵심 기능 섹션
- 카테고리 "위험 요소" -> 리스크 섹션
- 카테고리 "경쟁사" -> 경쟁 분석 섹션
- 나머지 -> 기타 섹션

### PRD 변환 규칙
- 카테고리 "해결책" 노드 -> 기능 요구사항 목록
- 노드 설명 -> 수용 기준 (Acceptance Criteria)

### Task 목록 변환 규칙
- 카테고리 "해결책" 노드 -> Task 항목
- 하위 노드 -> Sub-task 항목
- 형식: `- [ ] {노드 제목}: {노드 설명}`

---

## 10. 구현 순서 (Do Phase 가이드)

```
Phase 1 — 기반 구조 (2-3일)
  1. Next.js 프로젝트 초기화
  2. Zustand 스토어 기본 구조
  3. 랜딩 페이지 UI

Phase 2 — AI 채팅 (2-3일)
  4. /api/chat 엔드포인트 (Claude API 스트리밍)
  5. ChatPanel + ChatMessage 컴포넌트
  6. NodeProposalCard + 승인/거절 로직

Phase 3 — 마인드맵 (3-4일)
  7. React Flow 기본 캔버스 세팅
  8. dagre 자동 레이아웃 연동
  9. 커스텀 MindmapNode 컴포넌트
  10. 노드 승인 시 마인드맵 업데이트

Phase 4 — 내보내기 (1-2일)
  11. /api/export 엔드포인트
  12. ExportDropdown + 다운로드 기능

Phase 5 — 마무리 (1일)
  13. 반응형 레이아웃 (모바일 탭)
  14. 세션 저장 (sessionStorage)
  15. 전체 플로우 QA
```

---

## 11. 미결정 사항 (구현 전 결정 필요)

| 항목 | 옵션 A | 옵션 B | 권장 |
|------|--------|--------|------|
| 내보내기 방식 | 파일 다운로드 | 클립보드 복사 | 파일 다운로드 (더 명확) |
| AI 모델 | claude-sonnet-4-6 | claude-opus-4-6 | Sonnet (속도+비용 균형) |
| 노드 저장 | sessionStorage만 | Supabase DB | sessionStorage 우선 (MVP) |
| 스트리밍 방식 | SSE (Server-Sent Events) | WebSocket | SSE (단방향이라 충분) |
