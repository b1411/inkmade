import type { ShapeType } from '~/composables/useDesign'

// SVG-путь фигуры в локальных координатах (0..w, 0..h). Используется и в
// vue-konva (<v-path>), и в offscreen-экспорте печатного файла (Konva.Path),
// поэтому геометрия фигур централизована здесь.
export function shapeData(type: ShapeType, w: number, h: number): string {
  const round = (n: number) => +n.toFixed(2)
  switch (type) {
    case 'rect':
      return `M0,0 H${round(w)} V${round(h)} H0 Z`
    case 'roundrect':
      return roundRectPath(w, h)
    case 'circle': {
      const rx = w / 2, ry = h / 2, cy = h / 2
      return `M0,${round(cy)} A${round(rx)},${round(ry)} 0 1,0 ${round(w)},${round(cy)} A${round(rx)},${round(ry)} 0 1,0 0,${round(cy)} Z`
    }
    case 'triangle':
      return `M${round(w / 2)},0 L${round(w)},${round(h)} L0,${round(h)} Z`
    case 'diamond':
      return `M${round(w / 2)},0 L${round(w)},${round(h / 2)} L${round(w / 2)},${round(h)} L0,${round(h / 2)} Z`
    case 'pentagon':
      return regularPolygon(w, h, 5)
    case 'hexagon':
      return regularPolygon(w, h, 6)
    case 'arrow':
      return arrowPath(w, h)
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

// прямоугольник со скруглёнными углами (радиус ~18% меньшей стороны)
function roundRectPath(w: number, h: number): string {
  const rd = (n: number) => +n.toFixed(2)
  const r = Math.min(w, h) * 0.18
  return `M${rd(r)},0 H${rd(w - r)} A${rd(r)},${rd(r)} 0 0 1 ${rd(w)},${rd(r)} `
    + `V${rd(h - r)} A${rd(r)},${rd(r)} 0 0 1 ${rd(w - r)},${rd(h)} `
    + `H${rd(r)} A${rd(r)},${rd(r)} 0 0 1 0,${rd(h - r)} `
    + `V${rd(r)} A${rd(r)},${rd(r)} 0 0 1 ${rd(r)},0 Z`
}

// правильный N-угольник, вписанный в bbox, вершиной вверх
function regularPolygon(w: number, h: number, sides: number): string {
  const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2
  let d = ''
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / sides
    const x = cx + rx * Math.cos(a)
    const y = cy + ry * Math.sin(a)
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `
  }
  return d + 'Z'
}

// блок-стрелка вправо в пределах bbox
function arrowPath(w: number, h: number): string {
  const rd = (n: number) => +n.toFixed(2)
  const head = w * 0.6
  return `M0,${rd(h * 0.3)} H${rd(head)} V${rd(h * 0.1)} L${rd(w)},${rd(h / 2)} `
    + `L${rd(head)},${rd(h * 0.9)} V${rd(h * 0.7)} H0 Z`
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
