import dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'
import type { MindmapNode } from './types'

const NODE_WIDTH = 220
const NODE_HEIGHT = 180

export type LayoutDirection = 'TB' | 'LR'

export function computeLayout(
  nodes: MindmapNode[],
  direction: LayoutDirection = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 })

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  // 부모-자식 관계로 엣지 생성
  nodes.forEach((node) => {
    if (node.parentId) {
      graph.setEdge(node.parentId, node.id)
    }
  })

  dagre.layout(graph)

  const flowNodes: Node[] = nodes.map((node) => {
    const pos = graph.node(node.id)
    return {
      id: node.id,
      type: 'mindmapNode',
      position: {
        x: pos ? pos.x - NODE_WIDTH / 2 : 0,
        y: pos ? pos.y - NODE_HEIGHT / 2 : 0,
      },
      data: node as unknown as Record<string, unknown>,
    }
  })

  const flowEdges: Edge[] = nodes
    .filter((n) => n.parentId)
    .map((n) => ({
      id: `e-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: 'smoothstep',
      style: { stroke: '#d1d5db', strokeWidth: 1.5 },
    }))

  return { nodes: flowNodes, edges: flowEdges }
}
