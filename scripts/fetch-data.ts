/**
 * Pre-fetch Bangumi API data with incremental saving.
 * Resumable — skips already-cached months on re-run.
 *
 * Usage: npx tsx scripts/fetch-data.ts
 */
import * as fs from 'fs'
import * as path from 'path'

const BGM = 'https://api.bgm.tv'
const OUT_DIR = 'public/data'
const SEASONS_DIR = path.join(OUT_DIR, 'seasons')

// ─── Helpers ───

async function fetchJSON<T>(url: string): Promise<T> {
  console.log(`  GET ${url}`)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function unescapeHtml(str: string): string {
  if (!str) return ''
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function readJSON<T>(filePath: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) }
  catch { return fallback }
}

function writeJSON(filePath: string, data: any) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data))
}

function seasonKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

// ─── Calendar ───

async function fetchCalendar() {
  const data: any[] = await fetchJSON(`${BGM}/calendar`)
  for (const day of data) {
    for (const item of day.items) {
      if (item.name_cn) item.name_cn = unescapeHtml(item.name_cn)
    }
  }
  return data
}

// ─── Seasonal ───

async function fetchSubjectsPage(year: number, month: number, offset = 0) {
  const params = new URLSearchParams({
    type: '2', sort: 'date',
    year: String(year), month: String(month),
    limit: '50', offset: String(offset),
  })
  return fetchJSON<any>(`${BGM}/v0/subjects?${params}`)
}

async function fetchAllSubjects(year: number, month: number) {
  const all: any[] = []
  let offset = 0
  while (true) {
    const data = await fetchSubjectsPage(year, month, offset)
    if (!data.data?.length) break
    all.push(...data.data)
    if (data.data.length < 50) break
    offset += 50
    await sleep(300)
  }
  return all
}

// ─── Detail ───

async function fetchSubjectDetail(id: number) {
  return fetchJSON<any>(`${BGM}/v0/subjects/${id}`)
}

async function fetchAllEpisodes(subjectId: number) {
  const all: any[] = []
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      subject_id: String(subjectId), offset: String(offset), limit: '100',
    })
    const data = await fetchJSON<any>(`${BGM}/v0/episodes?${params}`)
    if (!data.data?.length) break
    all.push(...data.data.filter((ep: any) => ep.type === 0))
    if (data.data.length < 100) break
    offset += 100
    await sleep(200)
  }
  return all
}

// ─── Main ───

async function main() {
  console.log('📡 Fetching Bangumi data (incremental, resumable)...\n')
  ensureDir(SEASONS_DIR)

  // 1. Calendar (always fresh)
  console.log('[1/3] Calendar...')
  const calendar = await fetchCalendar()
  const calIds = new Set<number>()
  for (const day of calendar) {
    for (const item of day.items) calIds.add(item.id)
  }
  writeJSON(path.join(OUT_DIR, 'calendar.json'), calendar)
  console.log(`  ✓ calendar.json (${calIds.size} subjects)\n`)

  // 2. Seasonal subjects per month — save to individual files
  console.log('[2/3] Seasonal subjects (2000 ~ present)...')
  const now = new Date()
  const startYear = 2000
  const endYear = now.getFullYear() + 2
  let totalMonths = 0

  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const key = seasonKey(y, m)
      const filePath = path.join(SEASONS_DIR, `${key}.json`)

      // Skip if already cached
      if (fs.existsSync(filePath)) {
        totalMonths++
        if (m === 12) console.log(`  Year ${y} done (already cached)`)
        continue
      }

      const subjects = await fetchAllSubjects(y, m)
      if (subjects.length > 0) {
        writeJSON(filePath, subjects)
      }
      totalMonths++
      await sleep(500)
    }
    console.log(`  Year ${y} done (${totalMonths} months cached)`)
    await sleep(500)
  }
  console.log(`  Total: ${totalMonths} months cached\n`)

  // 3. Subject details — only calendar anime, incremental save
  console.log('[3/3] Subject details (calendar + current season)...')
  const animePath = path.join(OUT_DIR, 'anime.json')
  const cachedAnime: Record<number, any> = readJSON(animePath, {})

  // Collect IDs: calendar + current season
  const detailIds = new Set<number>(calIds)
  const curKey = seasonKey(now.getFullYear(), now.getMonth() + 1)
  const curFile = path.join(SEASONS_DIR, `${curKey}.json`)
  if (fs.existsSync(curFile)) {
    for (const s of readJSON<any[]>(curFile, [])) detailIds.add(s.id)
  }

  // Filter out already-cached IDs
  const todo = [...detailIds].filter(id => !cachedAnime[id])
  console.log(`  ${todo.length} new subjects to fetch (${Object.keys(cachedAnime).length} already cached)`)
  let done = 0
  for (const id of todo) {
    try {
      const [detail, episodes] = await Promise.all([
        fetchSubjectDetail(id), fetchAllEpisodes(id),
      ])
      cachedAnime[id] = { detail, episodes }
      done++
      if (done % 10 === 0) {
        writeJSON(animePath, cachedAnime)
        console.log(`  ${done}/${todo.length} (saved)`)
      }
      await sleep(300)
    } catch (e) {
      console.error(`  ✗ Subject ${id}:`, (e as Error).message)
    }
  }
  writeJSON(animePath, cachedAnime)
  console.log(`  ✓ anime.json (${Object.keys(cachedAnime).length} subjects)\n`)

  console.log('✅ Done!')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
