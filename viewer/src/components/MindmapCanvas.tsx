import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react'
import type { MindmapData, MindmapNode, NodeCategory } from '../lib/types'
import { computeGroupLayout } from '../lib/groupLayout'
import MindmapNodeComponent from './MindmapNode'
import GroupNodeComponent from './GroupNode'
import DetailPanel from './DetailPanel'
import CategoryNav from './CategoryNav'
import { useThemeStore } from '../stores/useThemeStore'

const nodeTypes: NodeTypes = {
  mindmapNode: MindmapNodeComponent as never,
  groupNode: GroupNodeComponent as never,
}

/** 노드의 전체 PHVI 체인(조상 + 후손)을 구한다 */
function getNodeChain(nodeId: string, allNodes: MindmapNode[]): Set<string> {
  const chain = new Set<string>()

  // 조상 추적
  let currentId: string | null = nodeId
  while (currentId) {
    chain.add(currentId)
    const node = allNodes.find((n) => n.id === currentId)
    if (!node?.parentId) break
    currentId = node.parentId
  }

  // 후손 추적
  function addDescendants(id: string) {
    chain.add(id)
    allNodes.filter((n) => n.parentId === id).forEach((child) => addDescendants(child.id))
  }
  addDescendants(nodeId)

  return chain
}

interface Props {
  data: MindmapData
  isPlaceholder: boolean
}

// 초기 뷰 포커스용 카테고리 우선순위
const INITIAL_FOCUS_ORDER: NodeCategory[] = ['문제정의', '핵심문제']

function MindmapCanvasInner({ data, isPlaceholder }: Props) {
  const [selectedNode, setSelectedNode] = useState<MindmapNode | null>(null)
  const [hoveredChain, setHoveredChain] = useState<Set<string> | null>(null)
  const [focusedCategory, setFocusedCategory] = useState<NodeCategory | null>(null)
  const isDark = useThemeStore((s) => s.theme) === 'dark'
  const { fitView, getNodes } = useReactFlow()
  const initialFocusDone = useRef(false)

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => computeGroupLayout(data.nodes),
    [data.nodes]
  )

  // 데이터에 존재하는 카테고리 목록
  const activeCategories = useMemo(() => {
    return new Set(data.nodes.map((n) => n.category))
  }, [data.nodes])

  // 카테고리 클릭 → 해당 그룹으로 뷰 이동
  const handleCategoryClick = useCallback((category: NodeCategory) => {
    setFocusedCategory(category)
    setSelectedNode(null)
    const groupId = `group-${category}`
    setTimeout(() => {
      fitView({ nodes: [{ id: groupId }], padding: 0.3, duration: 400 })
    }, 50)
  }, [fitView])

  // 초기 진입 시 문제정의 그룹으로 포커스
  useEffect(() => {
    if (initialFocusDone.current) return
    const nodes = getNodes()
    if (nodes.length === 0) return

    const targetCategory = INITIAL_FOCUS_ORDER.find((cat) => activeCategories.has(cat))
    if (targetCategory) {
      initialFocusDone.current = true
      setFocusedCategory(targetCategory)
      const groupId = `group-${targetCategory}`
      setTimeout(() => {
        fitView({ nodes: [{ id: groupId }], padding: 0.3, duration: 600 })
      }, 100)
    }
  }, [flowNodes, fitView, getNodes, activeCategories])

  // 호버/선택 상태에 따라 노드 스타일링
  const styledNodes = useMemo(() => {
    return flowNodes.map((node) => {
      if (node.type === 'groupNode') return node

      const classes: string[] = []

      // 호버 체인 상태
      if (hoveredChain) {
        classes.push(hoveredChain.has(node.id) ? 'node-in-chain' : 'node-dimmed')
      }

      // 선택 상태
      if (selectedNode?.id === node.id) {
        classes.push('node-selected')
      }

      const isSelected = selectedNode?.id === node.id
      const updatedNode = {
        ...node,
        data: { ...node.data, _isSelected: isSelected },
        ...(classes.length > 0 ? { className: classes.join(' ') } : {}),
      }
      return updatedNode
    })
  }, [flowNodes, hoveredChain, selectedNode])

  // 호버 시 엣지 하이라이트 (생동감 있는 컬러)
  const styledEdges = useMemo(() => {
    return flowEdges.map((edge) => {
      if (!hoveredChain) {
        return {
          ...edge,
          style: { ...edge.style, opacity: isDark ? 0.3 : 0.15 },
        }
      }

      const isHighlighted = hoveredChain.has(edge.source) && hoveredChain.has(edge.target)
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isHighlighted ? 1 : (isDark ? 0.15 : 0.05),
          strokeWidth: isHighlighted ? 2.5 : 1,
        },
        animated: isHighlighted,
      }
    })
  }, [flowEdges, hoveredChain, isDark])

  const handleNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'groupNode') return
    setSelectedNode(node.data as unknown as MindmapNode)
    setFocusedCategory(null)
  }, [])

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const handleNodeMouseEnter: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'groupNode') return
    const chain = getNodeChain(node.id, data.nodes)
    setHoveredChain(chain)
  }, [data.nodes])

  const handleNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    setHoveredChain(null)
  }, [])

  return (
    <div className="w-full h-full flex bg-[#fafbfc] dark:bg-gray-950">
      {/* 캔버스 + 모바일 하단 카테고리 칩 */}
      <div className="flex-1 relative">
        {isPlaceholder && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              예시 데이터
            </span>
          </div>
        )}

        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.15, minZoom: 0.55, maxZoom: 1.2 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--rf-bg-dot, #e2e5ea)"
            className="!bg-[#fafbfc] dark:!bg-gray-950"
          />
          <Controls
            className="!rounded-xl !border-gray-200 !shadow-sm"
            showInteractive={false}
          />
        </ReactFlow>
      </div>

      {/* 우측 패널: 노드 선택 시 상세 패널, 아닐 때 카테고리 네비게이션 */}
      {selectedNode ? (
        <DetailPanel
          node={selectedNode}
          data={data}
          onClose={() => setSelectedNode(null)}
          onNavigate={setSelectedNode}
        />
      ) : null}

      {/* 카테고리 네비게이션: 데스크탑은 우측 패널, 모바일은 캔버스 내부 하단 칩 바 */}
      {!selectedNode && (
        <CategoryNav
          activeCategories={activeCategories}
          focusedCategory={focusedCategory}
          onCategoryClick={handleCategoryClick}
        />
      )}
    </div>
  )
}

export default function MindmapCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <MindmapCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
