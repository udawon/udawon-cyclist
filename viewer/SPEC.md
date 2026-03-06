# Cyclist - 브레인스토밍 프로젝트 모아보기

> 생성일: 2026-03-07
> 상태: 설계 단계

---

## 1. 개요

Cyclist는 `/brainstorm` 스킬로 생성한 PHVI 사이클 기반 브레인스토밍 결과물을 모아보고 관리하는 개인 포트폴리오 웹사이트다. 프로젝트별 마인드맵, SPEC, PRD, TASKS 문서를 한 곳에서 탐색할 수 있다.

### 핵심 가치
- **모아보기**: 여러 브레인스토밍 프로젝트를 한 대시보드에서 관리
- **시각화**: 기존 React Flow 마인드맵 뷰어로 PHVI 구조를 직관적으로 탐색
- **포트폴리오**: 외부에 공유 가능한 정적 사이트로 배포

---

## 2. 사용자

- **주 사용자**: 본인 (개인 도구)
- **부 사용자**: 포트폴리오 방문자 (읽기 전용)

---

## 3. 데이터 구조

### 저장 방식
- 로컬 파일 기반 (JSON + Markdown)
- `public/projects/` 하위에 프로젝트별 폴더
- 프로젝트 추가/수정 시 git push → Vercel 자동 재배포

### 폴더 구조
```
viewer/
├─ src/
│  ├─ pages/           ← 라우팅 (대시보드, 프로젝트 상세)
│  ├─ components/      ← 공통 컴포넌트
│  └─ lib/             ← 유틸리티, 타입
├─ public/
│  └─ projects/
│     ├─ index.json    ← 프로젝트 목록 메타데이터
│     ├─ sticky-office/
│     │  ├─ mindmap.json
│     │  ├─ SPEC.md
│     │  ├─ PRD.md
│     │  └─ TASKS.md
│     └─ {project-slug}/
│        ├─ mindmap.json
│        ├─ SPEC.md
│        ├─ PRD.md
│        └─ TASKS.md
```

### index.json 스키마
```json
{
  "projects": [
    {
      "slug": "sticky-office",
      "name": "우리 팀의 업무 프레임워크",
      "description": "팀 업무 가시성과 동기부여를 위한 상시 상주형 협업 도구",
      "createdAt": "2026-03-06",
      "nodeCount": 36,
      "phviStatus": {
        "problem": true,
        "hypothesis": true,
        "validation": true,
        "improvement": true
      }
    }
  ]
}
```

---

## 4. 레이아웃

### 전체 구조
```
┌──────────────────────────────────────┐
│  Cyclist 로고        라이트/다크 토글  │  ← 헤더
├──────────┬───────────────────────────┤
│ 프로젝트  │                           │
│ 목록     │    메인 콘텐츠 영역         │
│          │    (마인드맵 / 문서)        │
│ ──────── │                           │
│ 문서 탭   │                           │
│ - 마인드맵│                           │
│ - SPEC   │                           │
│ - PRD    │                           │
│ - TASKS  │                           │
└──────────┴───────────────────────────┘
```

### 헤더
- 좌측: Cyclist 로고/타이틀
- 우측: 라이트/다크 모드 토글
- PHVI 사이클 간단 안내 (툴팁 또는 작은 텍스트)

### 사이드바
- 상단: 프로젝트 리스트 (이름, 노드 수, 날짜)
- 하단: 선택된 프로젝트의 문서 탭 (마인드맵 / SPEC / PRD / TASKS)
- 프로젝트 선택 시 기본 탭은 마인드맵

### 메인 영역
- **마인드맵 탭**: 기존 React Flow 뷰어 (MindmapCanvas) 그대로 사용
- **문서 탭 (SPEC/PRD/TASKS)**: 마크다운 렌더링

---

## 5. 페이지 흐름

1. 사이트 접속 → 사이드바에 프로젝트 목록 표시
2. 프로젝트 미선택 시 → 메인 영역에 환영 메시지 + PHVI 간단 안내
3. 프로젝트 클릭 → 마인드맵 탭으로 이동 (기본)
4. 사이드바 문서 탭 클릭 → 해당 문서 마크다운 렌더링
5. 다른 프로젝트 클릭 → 해당 프로젝트 마인드맵으로 전환

---

## 6. 디자인

### 테마
- 라이트/다크 모드 토글 지원
- 라이트: 현재 뷰어 스타일 유지 (흰 배경, 밝은 톤)
- 다크: 어두운 배경, 밝은 텍스트

### PHVI 카테고리 색상 (기존 유지)
| 카테고리 | 색상 |
|---------|------|
| 문제정의 | #ef4444 (빨강) |
| 가설 | #3b82f6 (파랑) |
| 검증 | #f59e0b (앰버) |
| 개선 | #22c55e (초록) |
| 사용자 | #8b5cf6 (보라) |
| 경쟁사 | #ec4899 (핑크) |
| 위험요소 | #f97316 (오렌지) |
| 기술 | #06b6d4 (시안) |

### PHVI 안내
- 헤더 또는 환영 화면에서 PHVI 사이클 개념 간략 설명
- "문제정의(P) → 가설(H) → 검증(V) → 개선(I)" 한 줄 + 색상 범례

---

## 7. 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | React + Vite (기존 유지) |
| 라우팅 | React Router |
| 스타일링 | Tailwind CSS |
| 마인드맵 | @xyflow/react (기존 유지) |
| 마크다운 | react-markdown + remark-gfm |
| 다크모드 | Tailwind dark class 전략 |
| 상태관리 | Zustand (프로젝트 선택, 테마 등) |
| 배포 | Vercel (정적 빌드) |

---

## 8. brainstorm 스킬 연동

### 현재 스킬 출력 경로
```
viewer/public/mindmap.json   → 마인드맵 데이터
output/SPEC.md               → 스펙 문서
output/PRD.md                → 기능 요구사항
output/TASKS.md              → 할일 목록
```

### 변경 필요 사항
brainstorm 스킬의 파일 출력 경로를 프로젝트별 폴더로 변경:
```
viewer/public/projects/{slug}/mindmap.json
viewer/public/projects/{slug}/SPEC.md
viewer/public/projects/{slug}/PRD.md
viewer/public/projects/{slug}/TASKS.md
```
그리고 `index.json`에 프로젝트 메타데이터 추가/업데이트.

---

## 9. 구현 우선순위

### Phase 1: 기본 골격
- [ ] React Router 도입 (사이드바 + 메인 레이아웃)
- [ ] public/projects/index.json 생성
- [ ] 기존 mindmap.json을 projects/sticky-office/ 폴더로 이동
- [ ] 프로젝트 목록 사이드바 구현
- [ ] 프로젝트 선택 → 마인드맵 뷰어 연동

### Phase 2: 문서 탭
- [ ] react-markdown 도입
- [ ] SPEC/PRD/TASKS 마크다운 렌더링 탭 구현
- [ ] 사이드바 문서 탭 네비게이션

### Phase 3: 테마 & 디자인
- [ ] 다크 모드 토글 구현
- [ ] 헤더 컴포넌트
- [ ] 환영 화면 + PHVI 안내
- [ ] 반응형 레이아웃

### Phase 4: 스킬 연동 & 배포
- [ ] brainstorm 스킬 출력 경로 변경
- [ ] Vercel 배포 설정
- [ ] 기존 output/ 폴더 데이터 마이그레이션
