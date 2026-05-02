import type {
  CalendarDay,
  CleanCalendarDay,
  CleanCalendarItem,
  Subject,
  PagedEpisodes,
  PagedSubjects,
  DisplayEpisode,
  SubjectBrowse,
} from '@/types/bangumi'

const BGM_BASE = 'https://api.bgm.tv'

// ─── Local JSON cache ───

const BASE = import.meta.env.BASE_URL
const jsonCache = new Map<string, any>()

async function fetchLocalJSON<T>(filename: string): Promise<T | null> {
  if (jsonCache.has(filename)) return jsonCache.get(filename) as T
  try {
    const res = await fetch(`${BASE}data/${filename}`)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') || ''
    if (!ct.includes('application/json')) return null
    const data = await res.json()
    jsonCache.set(filename, data)
    return data
  } catch {
    return null
  }
}

// Sharded cache — loaded per ID range
const SHARD_SIZE = 1000
const loadedShards = new Map<number, Record<number, { detail: Subject; episodes: any[] }>>()

function shardFile(id: number): string {
  const start = Math.floor(id / SHARD_SIZE) * SHARD_SIZE
  return `subjects/${String(start).padStart(6, '0')}.json`
}

async function loadAnimeEntry(id: number) {
  // Check if shard is already loaded
  const start = Math.floor(id / SHARD_SIZE) * SHARD_SIZE
  if (loadedShards.has(start)) return loadedShards.get(start)![id] || null

  // Load shard file
  const data = await fetchLocalJSON<Record<number, { detail: Subject; episodes: any[] }>>(shardFile(id))
  if (data) loadedShards.set(start, data)
  return data?.[id] || null
}

async function loadAnimeCache() {
  // For backwards compat: load all loaded shards into a single map
  // Used by getHistorySubjects which needs to iterate all
  const all: Record<number, { detail: Subject; episodes: any[] }> = {}
  for (const [, shard] of loadedShards) {
    Object.assign(all, shard)
  }
  return Object.keys(all).length > 0 ? all : null
}

// ─── Helpers ───

function headers(): Record<string, string> {
  return { Accept: 'application/json' }
}

function unescapeHtml(str: string): string {
  if (!str) return ''
  const doc = new DOMParser().parseFromString(str, 'text/html')
  return doc.documentElement.textContent || str
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`)
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Calendar ───

export async function getCalendar(): Promise<CleanCalendarDay[]> {
  // Try local cache first
  const local = await fetchLocalJSON<CalendarDay[]>('calendar.json')
  if (local) {
    return local.map((day) => ({
      weekday: day.weekday,
      items: day.items.map((item): CleanCalendarItem => ({
        id: item.id,
        name: item.name,
        name_cn: item.name_cn || '',
        air_date: item.air_date,
        air_weekday: item.air_weekday,
        images: item.images,
        rating: item.rating,
        rank: item.rank,
        summary: item.summary,
      })),
    }))
  }
  // Fallback to API
  const data = await fetchJSON<CalendarDay[]>(`${BGM_BASE}/calendar`)
  return data.map((day) => ({
    weekday: day.weekday,
    items: day.items.map((item): CleanCalendarItem => ({
      id: item.id,
      name: item.name,
      name_cn: unescapeHtml(item.name_cn || ''),
      air_date: item.air_date,
      air_weekday: item.air_weekday,
      images: item.images,
      rating: item.rating,
      rank: item.rank,
      summary: item.summary,
    })),
  }))
}

// ─── Subjects Browse ───

export async function getSubjects(
  year: number, month: number, limit = 50, offset = 0
): Promise<PagedSubjects> {
  // Try per-month cache file first
  const key = `${year}-${String(month).padStart(2, '0')}`
  const local = await fetchLocalJSON<SubjectBrowse[]>(`seasons/${key}.json`)
  if (local) {
    const slice = local.slice(offset, offset + limit)
    return { data: slice, total: local.length, limit, offset }
  }
  // Fallback to API
  const params = new URLSearchParams({
    type: '2', sort: 'date',
    year: String(year), month: String(month),
    limit: String(limit), offset: String(offset),
  })
  return fetchJSON<PagedSubjects>(`${BGM_BASE}/v0/subjects?${params}`)
}

export async function getAllSubjects(year: number, month: number): Promise<SubjectBrowse[]> {
  const data = await getSubjects(year, month, 200)
  return data.data
}

// ─── Subject Detail ───

export async function getSubject(id: number): Promise<Subject> {
  // Try shard cache
  const entry = await loadAnimeEntry(id)
  if (entry?.detail) return entry.detail
  // Fallback to API
  return fetchJSON<Subject>(`${BGM_BASE}/v0/subjects/${id}`)
}

// ─── Episodes ───

export async function getAllEpisodes(subjectId: number): Promise<DisplayEpisode[]> {
  // Try shard cache
  const entry = await loadAnimeEntry(subjectId)
  if (entry?.episodes) {
    return entry.episodes
      .filter((ep: any) => ep.type === 0)
      .map((ep: any): DisplayEpisode => ({
        id: ep.id, sort: ep.sort,
        name: ep.name, name_cn: ep.name_cn,
        airdate: ep.airdate, duration: ep.duration,
        type: ep.type, desc: ep.desc,
      }))
  }
  // Fallback to API
  const episodes: DisplayEpisode[] = []
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      subject_id: String(subjectId),
      offset: String(offset), limit: '100',
    })
    const data = await fetchJSON<PagedEpisodes>(`${BGM_BASE}/v0/episodes?${params}`)
    if (!data.data?.length) break
    episodes.push(...data.data
      .filter((ep) => ep.type === 0)
      .map((ep): DisplayEpisode => ({
        id: ep.id, sort: ep.sort,
        name: ep.name, name_cn: ep.name_cn,
        airdate: ep.airdate, duration: ep.duration,
        type: ep.type, desc: ep.desc,
      }))
    )
    if (data.data.length < 100) break
    offset += 100
    await new Promise((r) => setTimeout(r, 150))
  }
  return episodes
}

// ─── History ───

export async function getHistorySubjects(): Promise<SubjectBrowse[]> {
  const today = new Date()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')

  // Try pre-generated cache first (instant)
  const cached = await fetchLocalJSON<SubjectBrowse[]>(`history/${mm}-${dd}.json`)
  if (cached && cached.length > 0) return cached

  // Fallback: scan seasonal files
  const startYear = 2000
  const endYear = today.getFullYear()
  const promises: Promise<SubjectBrowse[] | null>[] = []
  for (let y = startYear; y <= endYear; y++) {
    promises.push(fetchLocalJSON<SubjectBrowse[]>(`seasons/${y}-${mm}.json`))
  }
  const results = await Promise.all(promises)

  const todayDay = today.getDate()
  const all: SubjectBrowse[] = []
  for (const data of results) {
    if (!data) continue
    for (const subject of data) {
      const date = subject.date
      if (!date) continue
      const parts = date.split('-')
      if (parts.length < 3) continue
      if (parseInt(parts[2], 10) === todayDay) all.push(subject)
    }
  }
  return all
}

// ─── Search ───

export async function searchSubjects(keyword: string, limit = 30): Promise<PagedSubjects> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${BGM_BASE}/v0/search/subjects`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, sort: 'rank', filter: { type: [2], nsfw: false } }),
      signal: controller.signal,
      credentials: 'omit',
    })
    if (!res.ok) throw new Error(`Search failed: ${res.status}`)
    const data = await res.json()
    return { data: data.data || [], total: data.total || 0, limit, offset: 0 }
  } finally {
    clearTimeout(timeout)
  }
}
