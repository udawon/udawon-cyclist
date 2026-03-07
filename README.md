# Cyclist - 브레인스토밍 결과 포트폴리오 뷰어

브레인스토밍 결과물을 마인드맵으로 시각화하고, 프로젝트별 문서(SPEC, PRD, TASKS)를 한 곳에서 탐색할 수 있는 개인 포트폴리오 웹앱입니다.

## 주요 기능

- React Flow 기반 마인드맵 시각화 (PHVI 카테고리별 색상 구분)
- 프로젝트별 문서 탐색 (SPEC / PRD / TASKS 마크다운 렌더링)
- 사이드바 프로젝트 목록 + 문서 탭 네비게이션
- 라이트/다크 모드 지원
- 반응형 레이아웃

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | React + Vite |
| 라우팅 | React Router |
| 스타일링 | Tailwind CSS |
| 마인드맵 | @xyflow/react |
| 마크다운 | react-markdown + remark-gfm |
| 상태관리 | Zustand |
| 배포 | Vercel (정적 빌드) |

## 프로젝트 구조

```
viewer/                  <- React 웹앱 (Vite)
  src/
    components/
      layout/            <- AppLayout, Header, Sidebar
      pages/             <- WelcomePage, MindmapPage, MarkdownPage
    hooks/               <- useMindmapData, useMarkdown
    lib/                 <- 레이아웃 알고리즘, 타입 정의
    stores/              <- Zustand 스토어 (프로젝트, 테마)
  public/
    mindmap.json         <- 마인드맵 데이터
projects/                <- 브레인스토밍 결과 데이터
  index.json             <- 프로젝트 목록 메타데이터
  {project-slug}/
    mindmap.json
    SPEC.md
    PRD.md
    TASKS.md
docs/                    <- PDCA 설계 문서
.claude/skills/          <- Claude 스킬 (brainstorm 등)
```

## 로컬 실행

```bash
cd viewer
npm install
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 빌드

```bash
cd viewer
npm run build
npm run preview
```

## 뷰어 조작

| 동작 | 방법 |
|------|------|
| 노드 상세보기 | 노드 클릭 |
| 패널 닫기 | 빈 공간 클릭 또는 X 버튼 |
| 화면 맞추기 | Fit 버튼 |
| 줌 조절 | +/- 버튼 또는 마우스 휠 |
| 이동 | 드래그 |
