import type { ShapeType } from '~/composables/useDesign'

// SVG-путь фигуры в локальных координатах (0..w, 0..h). Используется и в
// vue-konva (<v-path>), и в offscreen-экспорте печатного файла (Konva.Path),
// поэтому геометрия фигур централизована здесь.
export function shapeData(type: ShapeType, w: number, h: number): string {
  const round = (n: number) => +n.toFixed(2)
  switch (type) {
    case 'rect':
      return `M0,0 H${round(w)} V${round(h)} H0 Z`
    case 'circle': {
      const rx = w / 2, ry = h / 2, cy = h / 2
      return `M0,${round(cy)} A${round(rx)},${round(ry)} 0 1,0 ${round(w)},${round(cy)} A${round(rx)},${round(ry)} 0 1,0 0,${round(cy)} Z`
    }
    case 'triangle':
      return `M${round(w / 2)},0 L${round(w)},${round(h)} L0,${round(h)} Z`
    case 'line':
      return `M0,${round(h / 2)} H${round(w)}`
    case 'star':
      return starPath(w, h)
    case 'heart':
      return heartPath(w, h)
    default:
      return `M0,0 H${round(w)} V${round(h)} H0 Z`
  }
}

function starPath(w: number, h: number, points = 5): string {
  const cx = w / 2, cy = h / 2
  const outer = Math.min(w, h) / 2
  const inner = outer * 0.5
  const step = Math.PI / points
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + i * step
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `
  }
  return d + 'Z'
}

function heartPath(w: number, h: number): string {
  // параметрическое сердце, нормализованное в bbox
  const pts: Array<[number, number]> = []
  for (let t = 0; t <= Math.PI * 2 + 0.01; t += Math.PI / 24) {
    const x = 16 * Math.sin(t) ** 3
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
    pts.push([x, y])
  }
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const sx = w / (maxX - minX), sy = h / (maxY - minY)
  let d = ''
  pts.forEach(([x, y], i) => {
    const px = (x - minX) * sx
    const py = (maxY - y) * sy // инвертируем ось Y (сердце вершиной вниз)
    d += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)} `
  })
  return d + 'Z'
}
