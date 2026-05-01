// Bangumi API TypeScript Interfaces
// Based on https://github.com/bangumi/api/blob/master/open-api/v0.yaml

// ─── Enums ───
export type SubjectType = 1 | 2 | 3 | 4 | 6
// 1=Book, 2=Anime, 3=Music, 4=Game, 6=Real

export type CollectionType = 1 | 2 | 3 | 4 | 5
// 1=Wish, 2=Watched, 3=Watching, 4=OnHold, 5=Dropped

export type EpisodeType = 0 | 1 | 2 | 3
// 0=Main, 1=SP, 2=OP, 3=ED

// ─── Images ───
export interface SubjectImages {
  large: string
  common: string
  medium: string
  small: string
  grid: string
}

export interface PersonImages {
  large: string
  medium: string
  small: string
  grid: string
}

// ─── Rating ───
export interface Rating {
  rank: number
  total: number
  score: number
  count: Record<number, number>
}

// ─── Collection Stats ───
export interface CollectionStats {
  wish: number
  collect: number
  doing: number
  on_hold: number
  dropped: number
}

// ─── Subject (Anime Detail) ───
export interface Subject {
  id: number
  type: SubjectType
  name: string
  name_cn: string
  summary: string
  nsfw: boolean
  date: string
  platform: string
  images: SubjectImages
  infobox: Array<{ key: string; value: string | Array<{ k: string; v: string }> }>
  volumes: number
  eps: number
  total_episodes: number
  rating: Rating
  collection: CollectionStats
  tags: Array<{ name: string; count: number }>
  meta_tags: string[]
}

// ─── Related Person (Staff) ───
export interface RelatedPerson {
  id: number
  name: string
  type: 1 | 2 | 3 // 1=Individual, 2=Company, 3=Group
  images: PersonImages | null
  relation: string
  career: string[]
  short_summary: string
}

// ─── Related Character ───
export interface RelatedCharacter {
  id: number
  name: string
  type: number
  images: PersonImages | null
  relation: string
  actors: Array<{
    id: number
    name: string
    images: PersonImages | null
    locked: boolean
  }>
}

// ─── Episode ───
export interface Episode {
  id: number
  type: EpisodeType
  name: string
  name_cn: string
  sort: number   // displayed episode number
  ep: number     // actual episode index
  airdate: string
  comment: number
  duration: string
  desc: string
  disc: number
  subject_id: number
}

export interface PagedEpisodes {
  data: Episode[]
  total: number
  limit: number
  offset: number
}

// ─── Calendar ───
export interface CalendarItem {
  id: number
  url: string
  type: number
  name: string
  name_cn: string // HTML-escaped!
  summary: string
  air_date: string
  air_weekday: number
  images: SubjectImages | null
  rating?: { score: number; total: number }
  rank?: number
  collection?: { doing: number }
}

export interface CalendarDay {
  weekday: {
    id: number
    en: string
    cn: string
    ja: string
  }
  items: CalendarItem[]
}

// ─── Subjects Browse ───
export interface SubjectBrowse {
  id: number
  type: SubjectType
  name: string
  name_cn: string
  summary: string
  date: string
  images: SubjectImages
  rating: Rating
  tags: Array<{ name: string; count: number }>
  eps: number
  collection: CollectionStats
}

export interface PagedSubjects {
  data: SubjectBrowse[]
  total: number
  limit: number
  offset: number
}

// ─── User Collection ───
export interface UserSubjectCollection {
  subject_id: number
  subject_type: number
  rate: number
  type: CollectionType
  comment: string
  tags: string[]
  private: boolean
  ep_status: number
  vol_status: number
  updated_at: string
  subject: Subject
}

export interface PagedUserCollection {
  data: UserSubjectCollection[]
  total: number
  limit: number
  offset: number
}

// ─── User ───
export interface User {
  id: number
  username: string
  nickname: string
  avatar: PersonImages
  sign: string
}

export interface UserMe extends User {
  email: string
  reg_time: string
  time_offset: number
}

// ─── Search ───
export interface SearchFilter {
  type?: SubjectType[]
  nsfw?: boolean
}

export interface SearchRequest {
  keyword: string
  sort?: 'match' | 'rank' | 'date'
  filter?: SearchFilter
}

// ─── App-level transformed types ───

/** Cleaned calendar item (HTML unescaped) */
export interface CleanCalendarItem {
  id: number
  name: string
  name_cn: string   // unescaped
  air_date: string
  air_weekday: number
  images: SubjectImages | null
  rating?: { score: number; total: number }
  rank?: number
  summary: string
}

export interface CleanCalendarDay {
  weekday: { id: number; en: string; cn: string; ja: string }
  items: CleanCalendarItem[]
}

/** Flattened episode with computed status for display */
export interface DisplayEpisode {
  id: number
  sort: number
  name: string
  name_cn: string
  airdate: string
  duration: string
  type: EpisodeType
  desc: string
}
