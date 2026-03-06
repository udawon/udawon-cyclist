# AI 브레인스토밍 시스템

Claude Code 스킬로 AI 인터뷰를 진행하고, React Flow 뷰어로 결과를 시각화합니다.

## 사용 방법

### 1. 브레인스토밍 시작

Claude Code에서:
```
/brainstorm
```
또는 프로젝트명과 함께:
```
/brainstorm 팀 업무 관리 도구
```

### 2. AI 인터뷰 진행

Claude가 질문을 던집니다. 자유롭게 답변하세요.
- 최소 5라운드, 최대 15라운드
- 매 3라운드마다 현재 구조를 텍스트 트리로 보여줍니다
- 충분하면 "마무리"라고 말하세요

### 3. 파일 생성 확인

브레인스토밍 완료 후 자동 생성:
```
viewer/public/mindmap.json   ← 마인드맵 데이터
output/SPEC.md               ← 프로젝트 스펙
output/PRD.md                ← 기능 요구사항
output/TASKS.md              ← 개발 할일 목록
```

### 4. 마인드맵 뷰어 실행

```bash
cd viewer
npx serve dist
```
브라우저에서 http://localhost:3000 열기

또는 VS Code에서 `viewer/dist/index.html` 우클릭 → Open with Live Server

---

## 뷰어 조작

| 동작 | 방법 |
|------|------|
| 노드 상세보기 | 노드 클릭 |
| 패널 닫기 | 빈 공간 클릭 또는 X 버튼 |
| 레이아웃 전환 | 상단 ↔ 가로 / ↕ 세로 버튼 |
| 화면 맞추기 | Fit 버튼 |
| 줌 조절 | +/- 버튼 또는 마우스 휠 |
| 이동 | 드래그 |

---

## 파일 구조

```
.claude/skills/brainstorm.md   ← Claude 스킬 (인터뷰 지침)
viewer/                        ← React Flow 뷰어 (Vite)
  dist/                        ← 빌드 결과 (브라우저에서 열기)
  public/mindmap.json          ← 브레인스토밍 결과 데이터
output/                        ← 생성된 문서들
docs/                          ← PDCA 설계 문서
```

## 뷰어 재빌드 (소스 수정 시)

```bash
cd viewer
npm run build
```
