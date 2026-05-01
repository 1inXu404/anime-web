/**
 * Pre-fetch all Bangumi API data and save as static JSON files.
 * Usage: npx tsx scripts/fetch-data.ts
 *
 * Output:
 *   public/data/calendar.json       — weekly calendar (unescaped)
 *   public/data/anime.json          — { [id]: { detail, episodes } } for all known anime
 *   public/data/seasons-index.json  — map of year-month → subject list
 */

const BGM = 'https://api.bgm.tv'
const OUT_DIR = 'public/data'

async function fetchJSON<T>(url: string): Promise<T> {
  console.log(`  GET ${url}`)
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// HTML unescape (Bangumi's name_cn in calendar is HTML-escaped)
function unescapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// ─── Calendar ───

async function fetchCalendar() {
  const data: any[] = await fetchJSON(`${BGM}/calendar`)
  // Unescape name_cn
  for (const day of data) {
    for (const item of day.items) {
      if (item.name_cn) item.name_cn = unescapeHtml(item.name_cn)
    }
  }
  return data
}

// ─── Seasonal subjects ───

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
    await sleep(200)
  }
  return all
}

// ─── Subject Detail + Episodes ───

async function fetchSubjectDetail(id: number) {
  return fetchJSON<any>(`${BGM}/v0/subjects/${id}`)
}

async function fetchEpisodesPage(subjectId: number, offset = 0) {
  const params = new URLSearchParams({
    subject_id: String(subjectId),
    offset: String(offset), limit: '100',
  })
  return fetchJSON<any>(`${BGM}/v0/episodes?${params}`)
}

async function fetchAllEpisodes(subjectId: number) {
  const all: any[] = []
  let offset = 0
  while (true) {
    const data = await fetchEpisodesPage(subjectId, offset)
    if (!data.data?.length) break
    // Only main episodes (type === 0)
    all.push(...data.data.filter((ep: any) => ep.type === 0))
    if (data.data.length < 100) break
    offset += 100
    await sleep(150)
  }
  return all
}

// ─── Main ───

async function main() {
  console.log('📡 Fetching Bangumi data...\n')

  // 1. Calendar
  console.log('[1/4] Calendar...')
  const calendar = await fetchCalendar()
  const subjectIds = new Set<number>()
  for (const day of calendar) {
    for (const item of day.items) {
      subjectIds.add(item.id)
    }
  }
  console.log(`  Got ${calendar.length} days, ${subjectIds.size} unique subjects\n`)

  // 2. Seasonal subjects (full current year + next spring)
  console.log('[2/4] Seasonal subjects...')
  const now = new Date()
  const seasonsMap: Record<string, any[]> = {}
  // Jan of current year through Mar of next year
  for (let m = 0; m <= now.getMonth() + 10; m++) {
    const year = now.getFullYear() + Math.floor(m / 12)
    const month = (m % 12) + 1
    const key = `${year}-${String(month).padStart(2, '0')}`
    console.log(`  ${key}...`)
    const subjects = await fetchAllSubjects(year, month)
    seasonsMap[key] = subjects
    for (const s of subjects) subjectIds.add(s.id)
    await sleep(300)
  }
  console.log(`  Total unique subjects: ${subjectIds.size}\n`)

  // 3. Subject details + episodes
  console.log('[3/4] Subject details + episodes...')
  const animeData: Record<number, any> = {}
  const ids = [...subjectIds]
  let done = 0
  for (const id of ids) {
    try {
      const [detail, episodes] = await Promise.all([
        fetchSubjectDetail(id),
        fetchAllEpisodes(id),
      ])
      animeData[id] = { detail, episodes }
      done++
      if (done % 10 === 0) console.log(`  ${done}/${ids.length}`)
      await sleep(250) // Rate limit
    } catch (e) {
      console.error(`  ✗ Subject ${id}:`, (e as Error).message)
    }
  }
  console.log(`  Fetched ${done}/${ids.length} subjects\n`)

  // 4. Write files
  console.log('[4/4] Writing files...')
  const fs = await import('fs')
  const path = await import('path')

  // Ensure output dir
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // Calendar
  fs.writeFileSync(
    path.join(OUT_DIR, 'calendar.json'),
    JSON.stringify(calendar)
  )
  console.log(`  ✓ calendar.json (${(JSON.stringify(calendar).length / 1024).toFixed(0)} KB)`)

  // Anime data
  fs.writeFileSync(
    path.join(OUT_DIR, 'anime.json'),
    JSON.stringify(animeData)
  )
  console.log(`  ✓ anime.json (${(JSON.stringify(animeData).length / 1024).toFixed(0)} KB)`)

  // Seasons index
  fs.writeFileSync(
    path.join(OUT_DIR, 'seasons-index.json'),
    JSON.stringify(seasonsMap)
  )
  console.log(`  ✓ seasons-index.json (${Object.keys(seasonsMap).length} months)`)

  console.log('\n✅ Done! Data saved to public/data/')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
