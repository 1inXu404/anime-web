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
const USER_AGENT = 'anime-web/1.0 (https://github.com/1inXu404/anime-web)'
const TOKEN = import.meta.env.VITE_BANGUMI_TOKEN || ''

function headers(auth = false): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  }
  if (auth) h['Authorization'] = `Bearer ${TOKEN}`
  return h
}

function unescapeHtml(str: string): string {
  if (!str) return ''
  const doc = new DOMParser().parseFromString(str, 'text/html')
  return doc.documentElement.textContent || str
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`)
  }
  return res.json()
}

// ─── Calendar ───

export async function getCalendar(): Promise<CleanCalendarDay[]> {
  const data = await fetchJSON<CalendarDay[]>(
    `${BGM_BASE}/calendar`,
    { headers: headers() }
  )
  return data.map((day) => ({
    weekday: day.weekday,
    items: day.items.map(
      (item): CleanCalendarItem => ({
        id: item.id,
        name: item.name,
        name_cn: unescapeHtml(item.name_cn),
        air_date: item.air_date,
        air_weekday: item.air_weekday,
        images: item.images,
        rating: item.rating,
        rank: item.rank,
        summary: item.summary,
      })
    ),
  }))
}

// ─── Subjects Browse (seasonal) ───

export async function getSubjects(
  year: number,
  month: number,
  limit = 50,
  offset = 0
): Promise<PagedSubjects> {
  const params = new URLSearchParams({
    type: '2', // Anime
    sort: 'date',
    year: String(year),
    month: String(month),
    limit: String(limit),
    offset: String(offset),
  })
  return fetchJSON<PagedSubjects>(
    `${BGM_BASE}/v0/subjects?${params}`,
    { headers: headers() }
  )
}

export async function getAllSubjects(
  year: number,
  month: number
): Promise<SubjectBrowse[]> {
  const all: SubjectBrowse[] = []
  let offset = 0
  const limit = 50
  while (true) {
    const data = await getSubjects(year, month, limit, offset)
    if (!data.data || data.data.length === 0) break
    all.push(...data.data)
    if (data.data.length < limit) break
    offset += limit
    await new Promise((r) => setTimeout(r, 100))
  }
  return all
}

// ─── Subject Detail ───

export async function getSubject(id: number): Promise<Subject> {
  return fetchJSON<Subject>(
    `${BGM_BASE}/v0/subjects/${id}`,
    { headers: headers() }
  )
}

// ─── Episodes ───

export async function getEpisodes(
  subjectId: number,
  offset = 0,
  limit = 100
): Promise<PagedEpisodes> {
  const params = new URLSearchParams({
    subject_id: String(subjectId),
    offset: String(offset),
    limit: String(limit),
  })
  return fetchJSON<PagedEpisodes>(
    `${BGM_BASE}/v0/episodes?${params}`,
    { headers: headers() }
  )
}

export async function getAllEpisodes(subjectId: number): Promise<DisplayEpisode[]> {
  const episodes: DisplayEpisode[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const data = await getEpisodes(subjectId, offset, limit)
    if (!data.data || data.data.length === 0) break
    const mainEps = data.data
      .filter((ep) => ep.type === 0) // Main episodes only
      .map(
        (ep): DisplayEpisode => ({
          id: ep.id,
          sort: ep.sort,
          name: ep.name,
          name_cn: ep.name_cn,
          airdate: ep.airdate,
          duration: ep.duration,
          type: ep.type,
          desc: ep.desc,
        })
      )
    episodes.push(...mainEps)
    if (data.data.length < limit) break
    offset += limit
    await new Promise((r) => setTimeout(r, 100))
  }
  return episodes
}

// ─── Search ───

export async function searchSubjects(keyword: string, limit = 20): Promise<PagedSubjects> {
  const res = await fetch(`${BGM_BASE}/v0/search/subjects`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword,
      sort: 'rank',
      filter: { type: [2], nsfw: false },
    }),
  })
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const data = await res.json()
  return { ...data, limit: limit }
}
