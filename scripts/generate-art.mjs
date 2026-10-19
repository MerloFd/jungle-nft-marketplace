// Gera arte abstrata SVG determinística para os NFTs e avatares fictícios.
// Uso: node scripts/generate-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nftDir = join(root, 'public', 'nfts')
const avatarDir = join(root, 'public', 'avatars')
mkdirSync(nftDir, { recursive: true })
mkdirSync(avatarDir, { recursive: true })

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PALETTES = [
  ['#1B0B3B', '#A259FF', '#FF6AD5', '#FFC371', '#3B1E7A'],
  ['#0B1D3A', '#00F5D4', '#A259FF', '#F15BB5', '#123A6B'],
  ['#2A0E2E', '#FF5E5B', '#FFED66', '#A259FF', '#4C1D4F'],
  ['#071A1F', '#2EC4B6', '#CBF3F0', '#FF9F1C', '#0E3B43'],
  ['#14082B', '#7B2FF7', '#F107A3', '#FFD166', '#2C0F5C'],
  ['#0D0D2B', '#4CC9F0', '#4361EE', '#F72585', '#1E1E5A'],
  ['#1F0A0A', '#FF7B00', '#FFB800', '#A259FF', '#4A1A12'],
  ['#05261F', '#06D6A0', '#FFD23F', '#EE4266', '#0B4A3C'],
  ['#1A1033', '#C77DFF', '#E0AAFF', '#72EFDD', '#3C096C'],
  ['#20063B', '#FF006E', '#FB5607', '#FFBE0B', '#3A0CA3'],
  ['#0A1A2F', '#8338EC', '#3A86FF', '#FFBE0B', '#162E52'],
  ['#2B1A00', '#FFB703', '#FB8500', '#8ECAE6', '#4D2E00'],
]

const r = (n) => Math.round(n)
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)]

function blobPath(rnd, cx, cy, radius, points = 7) {
  const pts = []
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const rr = radius * (0.65 + rnd() * 0.5)
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
  }
  let d = ''
  for (let i = 0; i < points; i++) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % points]
    const mx = (p0[0] + p1[0]) / 2
    const my = (p0[1] + p1[1]) / 2
    if (i === 0) {
      const pl = pts[points - 1]
      d += `M${r((pl[0] + p0[0]) / 2)} ${r((pl[1] + p0[1]) / 2)}`
    }
    d += `Q${r(p0[0])} ${r(p0[1])} ${r(mx)} ${r(my)}`
  }
  return d + 'Z'
}

function defs(id, pal, rnd) {
  const angle = r(rnd() * 360)
  return `<defs><linearGradient id="g${id}" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[4]}"/></linearGradient><radialGradient id="h${id}" cx="${(0.3 + rnd() * 0.4).toFixed(2)}" cy="${(0.3 + rnd() * 0.4).toFixed(2)}" r=".6"><stop offset="0" stop-color="${pal[1]}" stop-opacity=".7"/><stop offset="1" stop-color="${pal[1]}" stop-opacity="0"/></radialGradient><linearGradient id="a${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[2]}"/><stop offset="1" stop-color="${pal[3]}"/></linearGradient></defs>`
}

const STYLES = {
  blobs(rnd, pal, id) {
    let s = ''
    for (let i = 0; i < 4; i++) {
      const fill = i === 0 ? `url(#a${id})` : pal[1 + (i % 3)]
      s += `<path d="${blobPath(rnd, 120 + rnd() * 360, 120 + rnd() * 360, 90 + rnd() * 130)}" fill="${fill}" opacity="${(0.55 + rnd() * 0.4).toFixed(2)}"/>`
    }
    return s
  },
  circles(rnd, pal, id) {
    let s = ''
    const n = 9 + Math.floor(rnd() * 6)
    for (let i = 0; i < n; i++) {
      const fill = i % 4 === 0 ? `url(#a${id})` : pal[1 + (i % 3)]
      s += `<circle cx="${r(rnd() * 600)}" cy="${r(rnd() * 600)}" r="${r(20 + rnd() * 120)}" fill="${fill}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`
    }
    return s
  },
  grid(rnd, pal, id) {
    let s = ''
    const cells = 6
    const size = 600 / cells
    for (let x = 0; x < cells; x++) {
      for (let y = 0; y < cells; y++) {
        const v = rnd()
        const cx = x * size + size / 2
        const cy = y * size + size / 2
        const c = pal[1 + Math.floor(rnd() * 3)]
        if (v < 0.3) s += `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(size * 0.38)}" fill="${c}"/>`
        else if (v < 0.55) s += `<rect x="${r(x * size + 8)}" y="${r(y * size + 8)}" width="${r(size - 16)}" height="${r(size - 16)}" rx="12" fill="${c}" opacity=".85"/>`
        else if (v < 0.75) s += `<path d="M${r(x * size)} ${r(y * size + size)}A${r(size)} ${r(size)} 0 0 1 ${r(x * size + size)} ${r(y * size)}" fill="none" stroke="${c}" stroke-width="10"/>`
      }
    }
    return s + `<circle cx="300" cy="300" r="140" fill="url(#a${id})" opacity=".35"/>`
  },
  waves(rnd, pal) {
    let s = ''
    const n = 6
    for (let i = 0; i < n; i++) {
      const y = 140 + i * 70
      const amp = 30 + rnd() * 50
      const ph = rnd() * 200
      let d = `M0 ${r(y)}`
      for (let x = 0; x <= 600; x += 150) {
        d += ` C${r(x + 50)} ${r(y - amp + Math.sin(x + ph) * 10)} ${r(x + 100)} ${r(y + amp)} ${r(x + 150)} ${r(y)}`
      }
      d += ' L600 600 L0 600Z'
      s += `<path d="${d}" fill="${pal[1 + (i % 3)]}" opacity="${(0.25 + i * 0.1).toFixed(2)}"/>`
    }
    return s
  },
  rings(rnd, pal, id) {
    let s = ''
    const cx = r(200 + rnd() * 200)
    const cy = r(200 + rnd() * 200)
    for (let i = 9; i > 0; i--) {
      s += `<circle cx="${cx}" cy="${cy}" r="${i * 34}" fill="none" stroke="${pal[1 + (i % 3)]}" stroke-width="${r(6 + rnd() * 12)}" opacity="${(0.4 + rnd() * 0.5).toFixed(2)}"/>`
    }
    return s + `<circle cx="${cx}" cy="${cy}" r="40" fill="url(#a${id})"/>`
  },
  triangles(rnd, pal, id) {
    let s = ''
    for (let i = 0; i < 10; i++) {
      const x = rnd() * 600
      const y = rnd() * 600
      const k = 60 + rnd() * 140
      const a = rnd() * Math.PI * 2
      const p = [0, 1, 2]
        .map((j) => `${r(x + Math.cos(a + (j * 2 * Math.PI) / 3) * k)},${r(y + Math.sin(a + (j * 2 * Math.PI) / 3) * k)}`)
        .join(' ')
      s += `<polygon points="${p}" fill="${i % 3 === 0 ? `url(#a${id})` : pal[1 + (i % 3)]}" opacity="${(0.4 + rnd() * 0.5).toFixed(2)}"/>`
    }
    return s
  },
  stripes(rnd, pal) {
    let s = ''
    const angle = r(-40 + rnd() * 80)
    let g = `<g transform="rotate(${angle} 300 300)">`
    for (let i = -4; i < 14; i++) {
      const w = 20 + rnd() * 40
      g += `<rect x="${r(i * 55)}" y="-200" width="${r(w)}" height="1000" fill="${pal[1 + ((i + 4) % 3)]}" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`
    }
    s += g + '</g>'
    return s + `<circle cx="${r(150 + rnd() * 300)}" cy="${r(150 + rnd() * 300)}" r="110" fill="${pal[0]}" opacity=".6"/>`
  },
  orbit(rnd, pal, id) {
    let s = `<circle cx="300" cy="300" r="${r(90 + rnd() * 40)}" fill="url(#a${id})"/>`
    for (let i = 0; i < 4; i++) {
      const rx = 150 + i * 45
      const ry = 50 + rnd() * 70
      const rot = r(rnd() * 180)
      s += `<ellipse cx="300" cy="300" rx="${r(rx)}" ry="${r(ry)}" fill="none" stroke="${pal[1 + (i % 3)]}" stroke-width="5" transform="rotate(${rot} 300 300)" opacity=".8"/>`
      const a = rnd() * Math.PI * 2
      s += `<circle cx="${r(300 + Math.cos(a) * rx * 0.7)}" cy="${r(300 + Math.sin(a) * ry)}" r="${r(10 + rnd() * 16)}" fill="${pal[1 + ((i + 1) % 3)]}"/>`
    }
    return s
  },
}
const STYLE_NAMES = Object.keys(STYLES)

function grain(id) {
  return `<rect width="600" height="600" fill="url(#h${id})"/>`
}

function nftSvg(index, variant) {
  const pal = PALETTES[index % PALETTES.length]
  const rnd = mulberry32(index * 7919 + variant * 104729 + 13)
  const base = (index * 3) % STYLE_NAMES.length
  const style = STYLE_NAMES[(base + (variant - 1) * 2) % STYLE_NAMES.length]
  const id = `${index}${variant}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">${defs(id, pal, rnd)}<rect width="600" height="600" fill="url(#g${id})"/>${grain(id)}${STYLES[style](rnd, pal, id)}</svg>\n`
}

function avatarSvg(index) {
  const pal = PALETTES[(index * 5) % PALETTES.length]
  const rnd = mulberry32(index * 31337 + 7)
  const id = `av${index}`
  let shapes = ''
  for (let i = 0; i < 3; i++) {
    shapes += `<path d="${blobPath(rnd, 30 + rnd() * 60, 30 + rnd() * 60, 22 + rnd() * 22, 6)}" fill="${pal[1 + i]}" opacity=".85"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[4]}"/></linearGradient></defs><rect width="120" height="120" fill="url(#${id})"/>${shapes}</svg>\n`
}

let total = 0
let count = 0
let max = 0
for (let i = 1; i <= 40; i++) {
  for (let v = 1; v <= 3; v++) {
    const svg = nftSvg(i, v)
    const name = `nft-${String(i).padStart(2, '0')}-${v}.svg`
    writeFileSync(join(nftDir, name), svg)
    total += svg.length
    count++
    max = Math.max(max, svg.length)
  }
}
for (let i = 1; i <= 10; i++) {
  writeFileSync(join(avatarDir, `creator-${String(i).padStart(2, '0')}.svg`), avatarSvg(i))
}
writeFileSync(
  join(root, 'public', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#A259FF"/><path d="M20 44V20l24 24V20" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`,
)
console.log(`NFT SVGs: ${count}, média ${Math.round(total / count)} bytes, máximo ${max} bytes`)
