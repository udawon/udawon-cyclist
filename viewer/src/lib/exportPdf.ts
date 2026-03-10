import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * ReactFlow 컨테이너를 고해상도 PDF로 내보내기
 * 컨테이너를 임시로 전체 화면으로 확대하고 fitView를 트리거하여
 * 모든 노드를 포함한 마인드맵을 캡처한다.
 */
export async function exportMindmapToPdf(
  element: HTMLElement,
  filename: string = 'mindmap',
): Promise<void> {
  const target = element

  // 원본 스타일 저장
  const originalStyle = {
    position: target.style.position,
    top: target.style.top,
    left: target.style.left,
    width: target.style.width,
    height: target.style.height,
    zIndex: target.style.zIndex,
    background: target.style.background,
  }

  // 전체 화면 오버레이 (화면에 보여야 ReactFlow가 노드를 렌더링함)
  target.style.position = 'fixed'
  target.style.top = '0'
  target.style.left = '0'
  target.style.width = '100vw'
  target.style.height = '100vh'
  target.style.zIndex = '99999'
  target.style.background = '#ffffff'

  // ReactFlow에 fitView 트리거
  window.dispatchEvent(new Event('resize'))
  await new Promise(r => setTimeout(r, 100))
  window.dispatchEvent(new Event('mindmap-fit-for-export'))

  // ReactFlow가 fitView + 렌더링을 완료할 시간 확보
  await new Promise(r => setTimeout(r, 600))

  try {
    // 고해상도 캡처 (3x, JPEG 품질 0.95)
    const dataUrl = await toJpeg(target, {
      backgroundColor: '#ffffff',
      pixelRatio: 3,
      quality: 0.95,
      filter: (node) => {
        const cls = node.classList?.toString() ?? ''
        // 컨트롤 패널, 미니맵 제외
        if (cls.includes('react-flow__panel') || cls.includes('react-flow__controls')) return false
        // 카테고리 네비게이션 (데스크탑 + 모바일) 제외
        if ((node as HTMLElement).dataset?.exportIgnore === 'true') return false
        return true
      },
    })

    // 이미지 크기 계산
    const img = new Image()
    img.src = dataUrl
    await new Promise<void>((resolve) => { img.onload = () => resolve() })

    const imgWidth = img.width / 3
    const imgHeight = img.height / 3
    const margin = 10

    const isLandscape = imgWidth >= imgHeight
    const orientation = isLandscape ? 'landscape' : 'portrait'

    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })

    const pageW = orientation === 'landscape' ? 297 : 210
    const pageH = orientation === 'landscape' ? 210 : 297

    const fitWidth = pageW - margin * 2
    const fitScale = fitWidth / imgWidth
    const fitHeight = imgHeight * fitScale

    const yOffset = Math.max(margin, (pageH - fitHeight) / 2)

    pdf.addImage(dataUrl, 'JPEG', margin, yOffset, fitWidth, fitHeight)

    // jsPDF.save()가 localhost에서 UUID 파일명을 생성하는 문제 우회
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.pdf`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    // 다운로드 시작 후 충분히 기다린 뒤 정리
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 1000)
  } finally {
    // 원본 스타일 복원
    Object.assign(target.style, originalStyle)
    // 복원 후 다시 fitView
    window.dispatchEvent(new Event('resize'))
    await new Promise(r => setTimeout(r, 100))
    window.dispatchEvent(new Event('mindmap-fit-for-export'))
  }
}
