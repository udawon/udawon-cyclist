# Plan: brainstorm-skill

> 작성일: 2026-03-06
> 상태: Draft v1.0
> 참조: SPEC.md

---

## 1. 한 줄 목표

Claude Code에서 AI 인터뷰로 프레임워크를 구축하고, React Flow 뷰어로 마인드맵을 인터랙티브하게 시각화한다.

---

## 2. 문제 정의

| 기존 문제 | 해결 방향 |
|----------|----------|
| 프레임워크 구축 과정이 머릿속에서만 진행됨 | Claude 스킬이 질문으로 구조화 |
| 결과물이 텍스트 문서에 그침 | React Flow로 노드 그래프 시각화 |
| 웹앱 구조는 개인 용도에 비해 과함 | 스킬 + 로컬 뷰어로 경량화 |
| 별도 API 키 관리 필요 | Claude Code 내장 AI 활용 (키 불필요) |

---

## 3. 아키텍처 결정

### 구성 요소 2개

```
[1] Claude 스킬                    [2] React Flow 뷰어
.claude/skills/brainstorm.md  →   viewer/ (Vite 정적 빌드)

역할: AI 인터뷰 + 파일 생성         역할: mindmap.json 읽어서
                                   인터랙티브 마인드맵 렌더링
```

### 왜 플러그인이 아닌 스킬인가
- Claude에게 없는 도구가 필요하지 않음
- Write 도구로 파일 생성 충분
- 스킬이 유지보수가 훨씬 단순

### 왜 Mermaid가 아닌 React Flow인가
- 노드 드래그/이동 등 인터랙티브 조작 필요
- 클릭으로 노드 상세 보기 등 확장 가능성
- 카테고리별 색상 커스텀 노드 구현 가능

---

## 4. 데이터 흐름

```
1. 사용자: /brainstorm 실행
2. Claude: 질문 시작 ("어떤 문제를 해결하고 싶으신가요?")
3. 대화 반복 (AI 인터뷰 → 사용자 답변)
4. 브레인스토밍 완료 선언
5. Claude가 파일 생성:
   └── output/
       ├── mindmap.json   ← React Flow 뷰어용 노드 데이터
       ├── SPEC.md
       ├── PRD.md
       └── TASKS.md
6. 사용자: viewer/index.html 브라우저에서 열기
7. 뷰어가 mindmap.json 로드 → 인터랙티브 마인드맵 표시
```

### mindmap.json 스키마

```json
{
  "projectName": "프로젝트명",
  "createdAt": "2026-03-06",
  "nodes": [
    {
      "id": "node-1",
      "label": "핵심 문제",
      "description": "사용자가 겪는 주요 불편함",
      "category": "핵심문제",
      "parentId": null
    }
  ]
}
```

---

## 5. 기술 스택

### Claude 스킬
- 파일: `.claude/skills/brainstorm.md`
- 의존성 없음 (마크다운 지침)

### React Flow 뷰어
| 역할 | 기술 | 버전 |
|------|------|------|
| 빌드 | Vite | v6 |
| UI 프레임워크 | React | v19 |
| 마인드맵 | React Flow (@xyflow/react) | v12 |
| 자동 레이아웃 | dagre (@dagrejs/dagre) | 최신 |
| 스타일링 | Tailwind CSS | v4 |
| 언어 | TypeScript | v5 |

### 뷰어 데이터 로딩 방식
- **방식**: 뷰어 빌드 시 `public/mindmap.json` 위치에서 `fetch()`
- 뷰어는 `viewer/`에 한 번만 빌드해두고, Claude 스킬이 `output/mindmap.json`을 생성 → 사용자가 해당 파일을 `viewer/public/`에 복사하거나, viewer가 `output/` 경로를 직접 참조
- **최종**: `npx serve viewer/dist` 한 줄이면 실행 (또는 VS Code Live Server)

---

## 6. Claude 스킬 인터뷰 설계

### 인터뷰 단계

| 단계 | 목적 | 예시 질문 |
|------|------|----------|
| 1. 문제 탐색 | 핵심 문제 파악 | "어떤 불편함을 해결하고 싶으신가요?" |
| 2. 사용자 탐색 | 타깃 명확화 | "주로 누가 사용하게 될까요?" |
| 3. 해결책 탐색 | 기능 도출 | "어떤 방식으로 해결하면 좋을까요?" |
| 4. 사각지대 탐색 | 위험/경쟁 | "비슷한 서비스가 있나요? 실패할 수 있는 이유가 있다면?" |
| 5. 구조화 | MVP 범위 | "가장 먼저 만들어야 할 핵심 기능은 무엇인가요?" |

### AI 행동 원칙
1. 한 번에 1개 질문만
2. 답변에서 노드를 추출해 mindmap.json에 누적
3. 최소 5 라운드, 최대 15 라운드
4. 마지막 라운드에 전체 노드 목록 요약 후 확인 요청
5. 확인 후 파일 일괄 생성

---

## 7. 범위

### MVP In Scope
- [x] Claude 스킬 (인터뷰 + 파일 생성)
- [x] `mindmap.json` / `SPEC.md` / `PRD.md` / `TASKS.md` 생성
- [x] React Flow 뷰어 (노드 렌더링, 드래그, 줌)
- [x] 카테고리별 노드 색상 구분
- [x] dagre 자동 레이아웃
- [x] 노드 클릭 시 상세 설명 패널

### Out of Scope
- [ ] 뷰어에서 노드 직접 편집
- [ ] 실시간 협업
- [ ] 저장/히스토리 관리
- [ ] 클라우드 동기화

---

## 8. 파일 구조 (최종)

```
udawon-cyclist/
  SPEC.md
  docs/
  output/                      ← Claude 스킬이 생성하는 결과물
    mindmap.json
    SPEC.md
    PRD.md
    TASKS.md
  viewer/                      ← React Flow 뷰어 (한 번 빌드)
    src/
      App.tsx
      components/
      lib/
    public/
      mindmap.json             ← output에서 복사 or 심링크
    dist/                      ← 빌드 결과 (브라우저에서 열기)
  client/                      ← (삭제 예정 - 기존 웹앱)
```

---

## 9. 성공 기준

- `/brainstorm` 실행 → 5~15분 대화 → 파일 4개 생성
- 뷰어 열면 마인드맵이 자동 레이아웃으로 렌더링
- 노드 드래그, 줌인/아웃, 클릭 상세보기 동작
- SPEC.md가 바로 프로젝트 문서로 사용 가능한 수준
