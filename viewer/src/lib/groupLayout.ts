import type { Node, Edge } from '@xyflow/react'
import type { MindmapNode, NodeCategory } from './types'
import { CATEGORY_COLORS } from './types'

// 레이아웃 상수
const CARD_W = 200
const CARD_H = 76
const PAD_X = 28
const PAD_Y = 28
const GAP_X = 24
const GAP_Y = 20
const HEADER_H = 48
const GROUP_GAP = 80
const ROW_GAP = 80

// Row 1: PHVI 흐름 순서 (하위호환 포함)
const ROW1_ORDER: NodeCategory[] = ['문제정의', '핵심문제', '가설', '해결책', '검증', '개선']
// Row 2: 보조 카테고리
const ROW2_ORDER: NodeCategory[] = ['사용자', '위험요소', '경쟁사', '기술']

const CATEGORY_LABELS: Partial<Record<NodeCategory, string>> = {
  문제정의: '문제정의 (P)',
  핵심문제: '핵심문제',
  가설: '가설 (H)',
  해결책: '해결책',
  검증: '검증 (V)',
  개선: '개선 (I)',
  사용자: '사용자',
  위험요소: '위험요소',
  경쟁사: '경쟁 분석',
  기술: '기술 스택',
}

// --- 트리 레이아웃 ---

interface TreeNode {
  node: MindmapNode
  children: TreeNode[]
  col: number
  depth: number
}

interface FlatNode {
  node: MindmapNode
  col: number
  depth: number
}

/** 그룹 내 노드를 트리 구조로 변환 */
function buildTrees(items: MindmapNode[]): TreeNode[] {
  const itemIds = new Set(items.map((n) => n.id))
  const roots = items.filter((item) => !item.parentId || !itemIds.has(item.parentId))

  function buildSubtree(node: MindmapNode, depth: number): TreeNode {
    const children = items.filter((item) => item.parentId === node.id)
    return {
      node,
      children: children.map((child) => buildSubtree(child, depth + 1)),
      col: 0,
      depth,
    }
  }

  return roots.map((root) => buildSubtree(root, 0))
}

/** DFS로 열(column) 할당: 자식이 부모 바로 아래에 위치 */
function assignColumns(trees: TreeNode[]): number {
  let nextCol = 0

  function assign(tree: TreeNode): void {
    if (tree.children.length === 0) {
      tree.col = nextCol++
    } else {
      tree.children.forEach((child) => assign(child))
      const first = tree.children[0].col
      const last = tree.children[tree.children.length - 1].col
      tree.col = Math.floor((first + last) / 2)
    }
  }

  trees.forEach((tree) => assign(tree))
  return nextCol
}

/** 트리를 flat 배열로 변환 */
function flattenTrees(trees: TreeNode[]): FlatNode[] {
  const result: FlatNode[] = []

  function collect(tree: TreeNode) {
    result.push({ node: tree.node, col: tree.col, depth: tree.depth })
    tree.children.forEach(collect)
  }

  trees.forEach(collect)
  return result
}

// --- 그룹 레이아웃 ---

interface GroupLayout {
  id: string
  category: NodeCategory
  label: string
  items: MindmapNode[]
  flat: FlatNode[]
  totalCols: number
  width: number
  height: number
  x: number
  y: number
}

function buildGroupLayout(category: NodeCategory, items: MindmapNode[]): GroupLayout {
  const trees = buildTrees(items)
  const totalCols = Math.max(assignColumns(trees), 1)
  const flat = flattenTrees(trees)

  const maxDepth = flat.length > 0 ? Math.max(...flat.map((f) => f.depth)) : 0
  const totalRows = maxDepth + 1

  const width = totalCols * CARD_W + (totalCols - 1) * GAP_X + 2 * PAD_X
  const height = HEADER_H + totalRows * CARD_H + (totalRows - 1) * GAP_Y + PAD_Y

  return {
    id: `group-${category}`,
    category,
    label: CATEGORY_LABELS[category] ?? category,
    items,
    flat,
    totalCols,
    width: Math.max(width, CARD_W + 2 * PAD_X),
    height,
    x: 0,
    y: 0,
  }
}

// --- 메인 레이아웃 ---

export function computeGroupLayout(allNodes: MindmapNode[]): { nodes: Node[]; edges: Edge[] } {
  const flowNodes: Node[] = []

  // Row 1: PHVI 카테고리별 독립 그룹
  const row1Groups: GroupLayout[] = []
  for (const cat of ROW1_ORDER) {
    const items = allNodes.filter((n) => n.category === cat)
    if (items.length === 0) continue
    row1Groups.push(buildGroupLayout(cat, items))
  }

  let row1X = 0
  for (const g of row1Groups) {
    g.x = row1X
    g.y = 0
    row1X += g.width + GROUP_GAP
  }
  const row1MaxH = row1Groups.length > 0 ? Math.max(...row1Groups.map((g) => g.height)) : 0

  // Row 2: 보조 카테고리
  const row2Groups: GroupLayout[] = []
  for (const cat of ROW2_ORDER) {
    const items = allNodes.filter((n) => n.category === cat)
    if (items.length === 0) continue
    row2Groups.push(buildGroupLayout(cat, items))
  }

  let row2X = 0
  for (const g of row2Groups) {
    g.x = row2X
    g.y = row1MaxH + ROW_GAP
    row2X += g.width + GROUP_GAP * 0.7
  }

  // React Flow 노드 생성
  const allGroups = [...row1Groups, ...row2Groups]
  for (const group of allGroups) {
    const isRow1 = row1Groups.includes(group)

    // 그룹 프레임
    flowNodes.push({
      id: group.id,
      type: 'groupNode',
      position: { x: group.x, y: group.y },
      data: { label: group.label, color: CATEGORY_COLORS[group.category].border, count: group.items.length },
      style: { width: group.width, height: isRow1 ? row1MaxH : group.height },
    })

    // 카드 (트리 레이아웃: col/depth 기반 배치)
    for (const { node, col, depth } of group.flat) {
      flowNodes.push({
        id: node.id,
        type: 'mindmapNode',
        position: {
          x: PAD_X + col * (CARD_W + GAP_X),
          y: HEADER_H + depth * (CARD_H + GAP_Y),
        },
        parentId: group.id,
        extent: 'parent' as const,
        data: {
          ...node,
        } as unknown as Record<string, unknown>,
      })
    }
  }

  // 엣지 생성 (소스 노드 카테고리 색상 + 방향 핸들)
  const flowEdges: Edge[] = allNodes
    .filter((n) => n.parentId && allNodes.some((p) => p.id === n.parentId))
    .map((n) => {
      const sourceNode = allNodes.find((s) => s.id === n.parentId)
      const edgeColor = sourceNode
        ? (CATEGORY_COLORS[sourceNode.category]?.border ?? '#94a3b8')
        : '#94a3b8'
      const isCrossGroup = sourceNode && sourceNode.category !== n.category

      return {
        id: `e-${n.parentId}-${n.id}`,
        source: n.parentId!,
        target: n.id,
        type: isCrossGroup ? 'smoothstep' : 'straight',
        ...(isCrossGroup
          ? { sourceHandle: 'right-source', targetHandle: 'left-target' }
          : {}),
        style: { stroke: edgeColor, strokeWidth: 1.5 },
        ...(isCrossGroup ? { pathOptions: { borderRadius: 12 } } : {}),
      }
    })

  return { nodes: flowNodes, edges: flowEdges }
}
