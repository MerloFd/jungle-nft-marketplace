/**
 * Roda a auditoria: 3 medições por página e perfil, reporta a mediana de cada
 * categoria e LCP, CLS e TBT. Salva HTML/JSON de cada execução em
 * lighthouse/reports/ e um resumo em lighthouse/reports/summary.md.
 *
 * Uso: npm run build && npx vite preview --port 4173 &  depois  npm run lighthouse
 * Variáveis: LH_BASE_URL (padrão http://localhost:4173), CHROME_PATH.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import lighthouse from 'lighthouse'
import { desktopConfig } from 'lighthouse/core/config/desktop-config.js'
import * as chromeLauncher from 'chrome-launcher'
import { CATEGORIES, PAGES, RUNS, TARGETS } from './config.mjs'

const BASE = process.env.LH_BASE_URL || 'http://localhost:4173'
const OUT = path.resolve('lighthouse/reports')
await fs.mkdir(OUT, { recursive: true })

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
})

const rows = []
try {
  for (const profile of ['mobile', 'desktop']) {
    for (const page of PAGES) {
      const runs = []
      for (let i = 1; i <= RUNS; i++) {
        const result = await lighthouse(
          `${BASE}${page.path}`,
          { port: chrome.port, output: ['html', 'json'], onlyCategories: CATEGORIES, logLevel: 'error' },
          profile === 'desktop' ? desktopConfig : undefined,
        )
        const [html, json] = result.report
        const base = `${page.name}-${profile}-${i}`
        await fs.writeFile(path.join(OUT, `${base}.html`), html)
        await fs.writeFile(path.join(OUT, `${base}.json`), json)
        const lhr = result.lhr
        runs.push({
          scores: Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c].score ?? 0) * 100)])),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          version: lhr.lighthouseVersion,
          ua: lhr.environment.hostUserAgent,
        })
        console.log(`${base}: ${JSON.stringify(runs.at(-1).scores)}`)
      }
      rows.push({
        page: page.name,
        profile,
        ...Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
        lcp: median(runs.map((r) => r.lcp)),
        cls: median(runs.map((r) => r.cls)),
        tbt: median(runs.map((r) => r.tbt)),
        version: runs[0].version,
        ua: runs[0].ua,
      })
    }
  }
} finally {
  await chrome.kill()
}

const flag = (c, v) => (v >= TARGETS[c] ? `${v}` : `${v} (abaixo da meta ${TARGETS[c]})`)
const lines = [
  '# Lighthouse: mediana de 3 execuções',
  '',
  `- Lighthouse ${rows[0].version}`,
  `- Navegador: ${rows[0].ua}`,
  `- Máquina: ${os.type()} ${os.release()}, ${os.cpus().length} CPUs, Node ${process.version}`,
  `- Build otimizado (vite build + vite preview), cenário de mocks default`,
  `- Data: ${new Date().toISOString()}`,
  '',
  '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows.map(
    (r) =>
      `| ${r.page} | ${r.profile} | ${flag('performance', r.performance)} | ${flag('accessibility', r.accessibility)} | ${flag('best-practices', r['best-practices'])} | ${flag('seo', r.seo)} | ${Math.round(r.lcp)} | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} |`,
  ),
  '',
]
await fs.writeFile(path.join(OUT, 'summary.md'), lines.join('\n'))
await fs.writeFile(path.join(OUT, 'summary.json'), JSON.stringify(rows, null, 2))
console.log(lines.join('\n'))
