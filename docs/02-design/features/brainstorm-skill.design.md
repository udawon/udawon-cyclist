# Design: brainstorm-skill

> 참조: docs/01-plan/features/brainstorm-skill.plan.md
> 작성일: 2026-03-06
> 상태: Draft v1.0

---

## 1. 전체 구조

```
udawon-cyclist/
  .claude/
    skills/
      brainstorm.md          ← Claude 스킬 (인터뷰 지침)
  output/                    ← Claude가 생성하는 결과물
    mindmap.json
    SPEC.md
    PRD.md
    TASKS.md
  viewer/                    ← React Flow 뷰어 (Vite 앱)
    src/
    public/
    dist/                    ← 빌드 결과 (브라우저에서 열기)
  docs/
  SPEC.md
```

---

## 2. 구성 요소 1: Claude 스킬

### 파일: `.claude/skills/brainstorm.md`

#### 스킬 트리거
```
/brainstorm
/brainstorm {프로젝트명}
```

#### 스킬 동작 순서

```
[시작]
  1. 프로젝트명 수집 (인자로 없으면 첫 질문으로)
  2. 내부 상태 초기화: nodes = [], round = 0

[인터뷰 루프 — 최소 5라운드, 최대 15라운드]
  3. 단계별 질문 (아래 인터뷰 단계 참고)
  4. 사용자 답변에서 노드 추출 → nodes에 누적
  5. 현재 마인드맵 트리 텍스트로 출력 (매 3라운드마다)
  6. round++ → 5라운드 이후 "마무리할까요?" 옵션 제공

[마무리]
  7. 전체 노드 목록 요약 → 사용자 확인
  8. output/ 폴더에 파일 4개 생성
  9. 뷰어 실행 방법 안내
```

#### 인터뷰 단계 (질문 흐름)

| 라운드 | 단계 | 핵심 질문 |
|--------|------|----------|
| 1 | 문제 | "어떤 문제를 해결하고 싶으신가요? 현재 불편한 점이 무엇인가요?" |
| 2 | 사용자 | "이 서비스를 주로 누가 사용하게 될까요?" |
| 3 | 해결책 | "어떤 방식으로 이 문제를 해결하면 좋을까요?" |
| 4 | 사각지대 | "비슷한 서비스가 이미 있나요? 차별점은 무엇인가요?" |
| 5 | 위험 | "이 프로젝트가 실패할 수 있는 이유가 있다면 무엇일까요?" |
| 6+ | 심화 | 답변에서 파생된 추가 질문 (AI 자율 판단) |

#### AI 행동 규칙 (스킬 내 명시)
- 한 라운드에 질문 1개만
- 답변에서 핵심 개념을 추출해 `category + label + description`으로 노드화
- 매 3라운드마다 현재 트리 구조를 텍스트로 출력해 가시화
- 5라운드 이후 "계속할까요, 마무리할까요?" 물어봄
- 노드 추출 시 부모-자식 관계 판단 (핵심문제 → 세부문제 등)

#### 노드 카테고리 정의

| 카테고리 | 색상 코드 | 용도 |
|---------|---------|------|
| `핵심문제` | `#3b82f6` (blue) | 사용자가 겪는 핵심 불편함 |
| `해결책` | `#22c55e` (green) | 기능/서비스 아이디어 |
| `사용자` | `#a855f7` (purple) | 타깃 사용자 정의 |
| `경쟁사` | `#f97316` (orange) | 유사 서비스/대안 |
| `위험요소` | `#ef4444` (red) | 실패 가능성, 리스크 |
| `기술` | `#6b7280` (gray) | 기술 스택, 인프라 |
| `기타` | `#64748b` (slate) | 분류 불명확한 항목 |

---

## 3. 출력 파일 스키마

### `output/mindmap.json`

```json
{
  "projectName": "프로젝트명",
  "createdAt": "2026-03-06T10:00:00Z",
  "nodes": [
    {
      "id": "n1",
      "label": "팀 업무 비가시성",
      "description": "팀원이 서로 무슨 일을 하는지 파악하기 어려움. 중복 작업과 병목이 자주 발생.",
      "category": "핵심문제",
      "parentId": null
    },
    {
      "id": "n2",
      "label": "실시간 업무 현황판",
      "description": "팀원의 현재 업무를 한눈에 보는 대시보드. 카드 기반 UI.",
      "category": "해결책",
      "parentId": "n1"
    }
  ]
}
```

### `output/SPEC.md` 생성 규칙
- `핵심문제` 노드 → `## 문제 정의` 섹션
- `해결책` 노드 → `## 핵심 기능` 섹션
- `사용자` 노드 → `## 대상 사용자` 섹션
- `경쟁사` 노드 → `## 경쟁 분석` 섹션
- `위험요소` 노드 → `## 리스크` 섹션

### `output/PRD.md` 생성 규칙
- `해결책` 노드 1개 = FR(기능요구사항) 1개
- 자식 노드 = 세부 요구사항

### `output/TASKS.md` 생성 규칙
- `해결책` 노드 → `- [ ] 할일` 항목
- 자식 노드 → 들여쓰기 서브태스크

---

## 4. 구성 요소 2: React Flow 뷰어

### 기술 스택

```
Vite v6 + React 19 + TypeScript 5
@xyflow/react v12
@dagrejs/dagre (자동 레이아웃)
Tailwind CSS v4
```

### 파일 구조

```
viewer/
  src/
    App.tsx                  -- 루트: JSON 로드 + 뷰어 렌더링
    components/
      MindmapCanvas.tsx      -- React Flow 캔버스
      MindmapNode.tsx        -- 커스텀 노드 컴포넌트
      DetailPanel.tsx        -- 노드 클릭 시 우측 상세 패널
      Toolbar.tsx            -- 상단 툴바 (줌, 레이아웃, 내보내기)
      EmptyState.tsx         -- JSON 없을 때 안내 화면
    lib/
      layout.ts              -- dagre 레이아웃 계산
      types.ts               -- MindmapNode, MindmapEdge 타입
    hooks/
      useMindmapData.ts      -- JSON fetch + 파싱
  public/
    mindmap.json             -- (output/에서 복사)
    placeholder.json         -- 예시 데이터 (빈 상태용)
  index.html
  vite.config.ts
  tailwind.config.ts
```

### 화면 레이아웃

```
+--------------------------------------------------+
|  [프로젝트명]          [Fit] [+] [-]  [PNG 저장] |
+--------------------------------------------------+
|                                  |               |
|                                  |  상세 패널     |
|     React Flow 캔버스            |  (노드 클릭 시)|
|                                  |               |
|   [핵심문제]                      |  카테고리      |
|      ↓                           |  제목          |
|   [해결책A] [해결책B]             |  ─────────    |
|      ↓                           |  설명 텍스트   |
|   [세부기능]                      |               |
|                                  |               |
+--------------------------------------------------+
```

### 컴포넌트 상세

#### `MindmapNode.tsx`
```
+-------------------------+
|  [카테고리 뱃지]        |
|  노드 제목              |
|  ──────────────         |
|  • 설명 첫 줄           |
|  • 설명 둘째 줄         |
+-------------------------+
```
- 카테고리별 border 색상 + badge 색상
- 클릭 시 `DetailPanel` 열기
- 호버 시 그림자 강조

#### `DetailPanel.tsx`
- 우측 슬라이드인 패널 (너비 280px)
- 카테고리 뱃지, 전체 제목, 전체 설명 표시
- 부모 노드 링크 (클릭 시 해당 노드로 이동)

#### `Toolbar.tsx`
- Fit View 버튼
- 줌 인/아웃 버튼
- PNG 스크린샷 저장 (`toSvg` 또는 `toPng` from `@xyflow/react`)
- 레이아웃 방향 전환 (TB ↔ LR)

#### `useMindmapData.ts`
```typescript
// public/mindmap.json fetch → nodes/edges 변환
// 없으면 placeholder.json 사용
```

### dagre 레이아웃 설정
- 기본 방향: `TB` (Top → Bottom)
- 노드 간격: `nodesep: 50`, `ranksep: 80`
- 전환 가능: LR (Left → Right)

---

## 5. 데이터 연결 방식 (뷰어 ↔ output/)

### 방법: `public/mindmap.json` 심링크 or 복사

브레인스토밍 완료 후:
```bash
# 방법 A: 파일 복사 (Windows 친화적)
copy output\mindmap.json viewer\public\mindmap.json

# 방법 B: Claude 스킬이 직접 viewer/public/에 생성
# → 스킬 지침에서 경로를 viewer/public/mindmap.json으로 지정
```

**결정**: 스킬이 `viewer/public/mindmap.json`에 직접 생성 (복사 단계 제거)

뷰어 실행:
```bash
cd viewer && npx serve dist
# 또는 VS Code Live Server로 dist/index.html 열기
```

---

## 6. 구현 순서

```
Phase 1 — Claude 스킬 (1일)
  1. .claude/skills/brainstorm.md 작성
  2. 인터뷰 흐름 + 노드 추출 규칙 작성
  3. 파일 생성 지침 (mindmap.json, SPEC.md, PRD.md, TASKS.md)
  4. 실제 브레인스토밍 테스트

Phase 2 — Vite 뷰어 기반 (1일)
  5. Vite + React 19 + React Flow + Tailwind 초기화
  6. 타입 정의 (MindmapNode, MindmapEdge)
  7. useMindmapData 훅 (JSON fetch)
  8. MindmapCanvas + dagre 레이아웃

Phase 3 — UI 완성 (1일)
  9. MindmapNode 커스텀 컴포넌트 (카테고리 색상)
  10. DetailPanel (클릭 상세보기)
  11. Toolbar (Fit, 줌, PNG 저장, 방향 전환)
  12. EmptyState (데이터 없을 때)

Phase 4 — 연결 & 마무리 (0.5일)
  13. 스킬 출력 경로 → viewer/public/ 로 설정
  14. 전체 플로우 테스트 (스킬 실행 → 뷰어 확인)
  15. README 작성 (사용 방법)
  16. client/ 폴더 삭제 (기존 웹앱 정리)
```

---

## 7. 미결정 사항

| 항목 | 결정 |
|------|------|
| 뷰어 실행 방법 | `npx serve viewer/dist` 또는 VS Code Live Server |
| PNG 저장 | `@xyflow/react`의 `getNodesBounds` + `toSvg` 활용 |
| 스킬 출력 경로 | `viewer/public/mindmap.json` 직접 생성 |
| `client/` 삭제 | Do 단계에서 처리 |
