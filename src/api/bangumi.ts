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

// ─── Random ───

function isBlocked(detail: Subject): boolean {
  if (detail.tags?.some((t) => t.name.includes('里番'))) return true
  if (detail.name_cn?.includes('我的英雄学院')) return true
  if (detail.name?.includes('我的英雄学院')) return true
  return false
}

function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isEligible(detail: Subject): boolean {
  if (!detail.date) return false
  if (detail.date >= todayStr()) return false
  if (isBlocked(detail)) return false
  return true
}

function subjectToBrowse(detail: Subject): SubjectBrowse {
  return {
    id: detail.id,
    type: detail.type,
    name: detail.name,
    name_cn: detail.name_cn || '',
    summary: detail.summary || '',
    date: detail.date,
    images: detail.images,
    rating: detail.rating,
    tags: detail.tags,
    eps: detail.eps || detail.total_episodes || 0,
    collection: detail.collection,
  }
}

const MAX_SHARD = 646_000
const MAX_INDEX = Math.floor(MAX_SHARD / SHARD_SIZE)

function randomShardStart(tried: Set<number>): number {
  let start: number
  do {
    start = Math.floor(Math.random() * (MAX_INDEX + 1)) * SHARD_SIZE
  } while (tried.has(start))
  return start
}

async function loadShard(start: number) {
  const filename = `subjects/${String(start).padStart(6, '0')}.json`
  return fetchLocalJSON<Record<number, { detail: Subject; episodes: any[] }>>(filename)
}

/** Preload N real titles from random shards — used for animation cycling */
export async function getRandomTitles(count: number): Promise<string[]> {
  const titles = new Set<string>()
  const tried = new Set<number>()

  for (let i = 0; i < 10 && titles.size < count; i++) {
    const start = randomShardStart(tried)
    tried.add(start)
    const data = await loadShard(start)
    if (!data) continue

    for (const entry of Object.values(data)) {
      const name = entry.detail?.name_cn || entry.detail?.name
      if (name) titles.add(name)
      if (titles.size >= count) break
    }
  }

  return [...titles]
}

/**
 * Randomly pick one eligible subject from sharded cache.
 * Tries random shards one at a time until a match is found.
 * @param excludeIds IDs to skip (for no-repeat draws in same session)
 */
export async function getRandomSubject(excludeIds?: Set<number>): Promise<SubjectBrowse | null> {
  const tried = new Set<number>()

  for (let i = 0; i < 20; i++) {
    const start = randomShardStart(tried)
    tried.add(start)
    const data = await loadShard(start)
    if (!data) continue

    const entries: Subject[] = []
    for (const entry of Object.values(data)) {
      const d = entry.detail
      if (!isEligible(d)) continue
      if (excludeIds?.has(d.id)) continue
      entries.push(d)
    }

    if (entries.length > 0) {
      const chosen = entries[Math.floor(Math.random() * entries.length)]
      return subjectToBrowse(chosen)
    }
  }

  return null
}
