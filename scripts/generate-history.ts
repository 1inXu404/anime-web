/**
 * Generate today-in-history cache file from seasonal data.
 * Scans public/data/seasons/ for today's month, filters by day, saves result.
 *
 * Usage: npx tsx scripts/generate-history.ts
 * Output: public/data/history/MM-DD.json
 */
import * as fs from 'fs'
import * as path from 'path'

const SEASONS_DIR = 'public/data/seasons'
const HISTORY_DIR = 'public/data/history'

const today = new Date()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = today.getDate()
const ddStr = String(dd).padStart(2, '0')
const prefix = `-${mm}-`
const outFile = path.join(HISTORY_DIR, `${mm}-${ddStr}.json`)

// Load existing cache to merge into
let existing: any[] = []
if (fs.existsSync(outFile)) {
  try { existing = JSON.parse(fs.readFileSync(outFile, 'utf-8')) } catch {}
}
const existingIds = new Set(existing.map((s: any) => s.id))

// Scan all season files for this month
fs.mkdirSync(HISTORY_DIR, { recursive: true })
const files = fs.readdirSync(SEASONS_DIR).filter(f => f.includes(prefix) && f.endsWith('.json'))

let added = 0
for (const file of files) {
  const data: any[] = JSON.parse(fs.readFileSync(path.join(SEASONS_DIR, file), 'utf-8'))
  for (const subject of data) {
    if (existingIds.has(subject.id)) continue
    const date = subject.date
    if (!date) continue
    const parts = date.split('-')
    if (parts.length < 3) continue
    if (parseInt(parts[2], 10) === dd) {
      existing.push(subject)
      existingIds.add(subject.id)
      added++
    }
  }
}

fs.writeFileSync(outFile, JSON.stringify(existing))
console.log(`✓ ${outFile} (${existing.length} total, +${added} new)`)
