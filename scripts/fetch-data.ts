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
const SUBJECTS_DIR = path.join(OUT_DIR, 'subjects')
const SHARD_SIZE = 1000

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

function shardFile(id: number): string {
  const start = Math.floor(id / SHARD_SIZE) * SHARD_SIZE
  return path.join(SUBJECTS_DIR, `${String(start).padStart(6, '0')}.json`)
}

function loadShard(id: number): Record<number, any> {
  const fp = shardFile(id)
  if (fs.existsSync(fp)) {
    try { return JSON.parse(fs.readFileSync(fp, 'utf-8')) } catch {}
  }
  return {}
}

function saveShard(id: number, data: Record<number, any>) {
  ensureDir(SUBJECTS_DIR)
  writeJSON(shardFile(id), data)
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
  const startYear = 1921
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

  // 3. Subject details — sharded by ID range, smart caching
  console.log('[3/3] Subject details (sharded, smart caching)...')
  ensureDir(SUBJECTS_DIR)
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()
  const isFirstOfMonth = now.getDate() === 1

  // Load ALL cached shard data to check what's already cached
  const cachedAnime: Record<number, any> = {}
  if (fs.existsSync(SUBJECTS_DIR)) {
    for (const file of fs.readdirSync(SUBJECTS_DIR)) {
      if (!file.endsWith('.json')) continue
      Object.assign(cachedAnime, JSON.parse(fs.readFileSync(path.join(SUBJECTS_DIR, file), 'utf-8')))
    }
  }

  // Collect ALL subject IDs from ALL seasonal data
  const allIds = new Set<number>(calIds)
  const seasonFiles = fs.readdirSync(SEASONS_DIR).filter(f => f.endsWith('.json'))
  for (const file of seasonFiles) {
    const subjects = readJSON<any[]>(path.join(SEASONS_DIR, file), [])
    for (const s of subjects) allIds.add(s.id)
  }

  // Determine "airing" months: current + next 2
  const airingMonths = new Set<string>()
  for (let m = curMonth; m <= curMonth + 2; m++) {
    const y = curYear + Math.floor((m - 1) / 12)
    const mo = ((m - 1) % 12) + 1
    airingMonths.add(seasonKey(y, mo))
  }

  // Separate: need fetch vs already cached
  const toFetch: number[] = []
  let skipped = 0
  for (const id of allIds) {
    if (!cachedAnime[id]) {
      toFetch.push(id)
    } else if (isFirstOfMonth) {
      toFetch.push(id)
    } else {
      const detail = cachedAnime[id].detail
      if (detail?.date) {
        const parts = detail.date.split('-')
        if (parts.length >= 2) {
          const key = `${parts[0]}-${parts[1]}`
          if (airingMonths.has(key)) { toFetch.push(id); continue }
        }
      }
      skipped++
    }
  }

  console.log(`  ${toFetch.length} to fetch, ${skipped} skipped, ${Object.keys(cachedAnime).length} in cache`)
  let done = 0
  // Track which shards were modified
  const dirtyShards = new Set<string>()
  for (const id of toFetch) {
    try {
      const [detail, episodes] = await Promise.all([
        fetchSubjectDetail(id), fetchAllEpisodes(id),
      ])
      const shard = loadShard(id)
      shard[id] = { detail, episodes, updatedAt: new Date().toISOString() }
      saveShard(id, shard)
      dirtyShards.add(shardFile(id))
      done++
      if (done % 10 === 0) console.log(`  ${done}/${toFetch.length}`)
      await sleep(300)
    } catch (e) {
      console.error(`  ✗ Subject ${id}:`, (e as Error).message)
    }
  }
  console.log(`  ✓ ${Object.keys(cachedAnime).length + toFetch.length} subjects in ${dirtyShards.size} shards\n`)

  // 4. Stats
  console.log('[4/4] Stats...')
  // Count unique subject IDs across all seasons
  const allUnique = new Set<number>()
  const seasonFiles = fs.readdirSync(SEASONS_DIR).filter(f => f.endsWith('.json'))
  for (const file of seasonFiles) {
    for (const s of readJSON<any[]>(path.join(SEASONS_DIR, file), [])) {
      allUnique.add(s.id)
    }
  }
  // Count subjects with detail cache
  const withDetail = Object.keys(cachedAnime).length
  writeJSON(path.join(OUT_DIR, 'stats.json'), {
    totalSubjects: allUnique.size,
    withDetail,
    updatedAt: new Date().toISOString(),
  })
  console.log(`  ✓ stats.json (${allUnique.size} seasonal, ${withDetail} with details)\n`)

  // Generate seasons manifest — available months per year
  const manifest: Record<string, number[]> = {}
  for (const file of seasonFiles) {
    const m = file.match(/^(\d{4})-(\d{2})\.json$/)
    if (!m) continue
    const y = m[1]
    const mo = parseInt(m[2], 10)
    if (!manifest[y]) manifest[y] = []
    manifest[y].push(mo)
  }
  for (const y of Object.keys(manifest)) manifest[y].sort((a, b) => a - b)
  writeJSON(path.join(OUT_DIR, 'seasons-manifest.json'), manifest)
  console.log(`  ✓ seasons-manifest.json (${Object.keys(manifest).length} years)\n`)

  console.log('✅ Done!')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
