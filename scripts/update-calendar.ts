/**
 * Daily calendar update — fetches fresh airing schedule from Bangumi API.
 * Lightweight replacement for fetch-data.ts now that subject data comes from Archive.
 *
 * Usage: npx tsx scripts/update-calendar.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const BGM = 'https://api.bgm.tv'
const OUT_DIR = 'public/data'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

function unescapeHtml(str: string): string {
  if (!str) return ''
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

async function main() {
  console.log('📡 Fetching calendar...')
  ensureDir(OUT_DIR)

  const data: any[] = await fetchJSON(`${BGM}/calendar`)
  for (const day of data) {
    for (const item of day.items) {
      if (item.name_cn) item.name_cn = unescapeHtml(item.name_cn)
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'calendar.json'), JSON.stringify(data))
  const count = data.reduce((s: number, d: any) => s + d.items.length, 0)
  console.log(`  ✓ calendar.json (${count} airing subjects)`)

  // Also generate today's history
  console.log('📜 Generating history...')
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = today.getDate()
  const ddStr = String(dd).padStart(2, '0')
  const prefix = `-${mm}-`
  const seasonsDir = path.join(OUT_DIR, 'seasons')
  const historyDir = path.join(OUT_DIR, 'history')
  ensureDir(historyDir)
  const outFile = path.join(historyDir, `${mm}-${ddStr}.json`)

  let existing: any[] = []
  if (fs.existsSync(outFile)) {
    try { existing = JSON.parse(fs.readFileSync(outFile, 'utf-8')) } catch {}
  }
  const existingIds = new Set(existing.map((s: any) => s.id))

  if (fs.existsSync(seasonsDir)) {
    const files = fs.readdirSync(seasonsDir).filter(f => f.includes(prefix) && f.endsWith('.json'))
    for (const file of files) {
      const subjects: any[] = JSON.parse(fs.readFileSync(path.join(seasonsDir, file), 'utf-8'))
      for (const subject of subjects) {
        if (existingIds.has(subject.id)) continue
        const date = subject.date
        if (!date) continue
        const parts = date.split('-')
        if (parts.length < 3) continue
        if (parseInt(parts[2], 10) === dd) {
          existing.push(subject)
          existingIds.add(subject.id)
        }
      }
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(existing))
  console.log(`  ✓ ${outFile} (${existing.length} total)\n`)
  console.log('✅ Done!')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
