/**
 * Import Bangumi Archive dump data into the app's cached JSON format.
 * Replaces the slow API-based fetch-data.ts with local file processing.
 *
 * Usage: npx tsx scripts/import-archive.ts
 *
 * Input:  dump/subject.jsonlines, dump/episode.jsonlines
 * Output: public/data/seasons/*.json, public/data/subjects/*.json, stats.json, seasons-manifest.json
 */
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

const DUMP_DIR = 'dump'
const OUT_DIR = 'public/data'
const SEASONS_DIR = path.join(OUT_DIR, 'seasons')
const SUBJECTS_DIR = path.join(OUT_DIR, 'subjects')
const SHARD_SIZE = 1000

// ─── Helpers ───

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function writeJSON(filePath: string, data: any) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data))
}

function readJSON<T>(filePath: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return fallback }
}

function shardFile(id: number): string {
  const start = Math.floor(id / SHARD_SIZE) * SHARD_SIZE
  return path.join(SUBJECTS_DIR, `${String(start).padStart(6, '0')}.json`)
}

/** Parse episode count from infobox wiki text */
function parseEps(infobox: string): number {
  const m = infobox?.match(/\|话数=\s*(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

/** Parse platform from infobox (e.g. TV, 剧场版, OVA, WEB) */
function parsePlatform(platform: number): string {
  // platform IDs from bangumi/common
  const map: Record<number, string> = {
    1001: 'TV', 1002: '小说', 1003: '漫画', 1004: '游戏',
    2001: 'TV', 2002: '剧场版', 2003: 'OVA', 2004: 'WEB',
    3001: 'TV', 3002: '剧场版', 3003: 'OVA', 3004: 'WEB',
    4001: '游戏',
  }
  return map[platform] || '其他'
}

function lineStream(filePath: string) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf-8'),
    crlfDelay: Infinity,
  })
  return rl
}

// ─── Types ───

interface ArchiveSubject {
  id: number
  type: number
  name: string
  name_cn: string
  infobox: string
  platform: number
  summary: string
  nsfw: boolean
  date: string
  tags: Array<{ name: string; count: number }>
  meta_tags: string[]
  score: number
  score_details: Record<string, number>
  rank: number
  favorite: { wish: number; done: number; doing: number; on_hold: number; dropped: number }
  series: boolean
}

interface ArchiveEpisode {
  id: number
  name: string
  name_cn: string
  description: string
  airdate: string
  duration: string
  subject_id: number
  sort: number
  type: number
}

interface OldShardEntry {
  detail: { images?: any }
  episodes: any[]
}

// ─── Main ───

async function main() {
  console.log('📦 Importing Bangumi Archive data...\n')
  const startTime = Date.now()

  ensureDir(SEASONS_DIR)
  ensureDir(SUBJECTS_DIR)

  // ─── Phase 1: Load existing image cache ───
  console.log('[1/5] Loading existing image cache...')
  const imageMap = new Map<number, any>()
  if (fs.existsSync(SUBJECTS_DIR)) {
    for (const file of fs.readdirSync(SUBJECTS_DIR)) {
      if (!file.endsWith('.json')) continue
      const shard = readJSON<Record<number, OldShardEntry>>(path.join(SUBJECTS_DIR, file), {})
      for (const [idStr, entry] of Object.entries(shard)) {
        if (entry.detail?.images) {
          imageMap.set(parseInt(idStr), entry.detail.images)
        }
      }
    }
  }
  console.log(`  ✓ ${imageMap.size} images loaded from existing cache\n`)

  // ─── Phase 2: Read subjects ───
  console.log('[2/5] Reading subject.jsonlines...')
  const seasonMap = new Map<string, any[]>()      // "YYYY-MM" → SubjectBrowse[]
  const subjectDetails = new Map<number, any>()     // id → detail object
  let subjectCount = 0
  let animeCount = 0

  for await (const line of lineStream(path.join(DUMP_DIR, 'subject.jsonlines'))) {
    if (!line.trim()) continue
    const s: ArchiveSubject = JSON.parse(line)
    subjectCount++
    if (s.type !== 2) continue  // anime only
    animeCount++

    // Build seasonal entry (SubjectBrowse shape)
    const totalRatings = Object.values(s.score_details || {}).reduce((a, b) => a + b, 0)
    const browseEntry = {
      id: s.id,
      type: s.type,
      name: s.name,
      name_cn: s.name_cn || '',
      summary: s.summary || '',
      date: s.date || '',
      images: imageMap.get(s.id) || null,
      rating: {
        rank: s.rank || 0,
        total: totalRatings,
        score: s.score || 0,
        count: s.score_details || {},
      },
      tags: s.tags || [],
      eps: parseEps(s.infobox),
      collection: {
        wish: s.favorite?.wish || 0,
        collect: s.favorite?.done || 0,
        doing: s.favorite?.doing || 0,
        on_hold: s.favorite?.on_hold || 0,
        dropped: s.favorite?.dropped || 0,
      },
    }

    // Group by year-month
    if (s.date) {
      const parts = s.date.split('-')
      if (parts.length >= 2) {
        const key = `${parts[0]}-${parts[1]}`
        if (!seasonMap.has(key)) seasonMap.set(key, [])
        seasonMap.get(key)!.push(browseEntry)
      }
    }

    // Build detail entry (for subject shards)
    subjectDetails.set(s.id, {
      id: s.id,
      type: s.type,
      name: s.name,
      name_cn: s.name_cn || '',
      summary: s.summary || '',
      nsfw: s.nsfw || false,
      date: s.date || '',
      platform: parsePlatform(s.platform),
      images: imageMap.get(s.id) || null,
      infobox: s.infobox ? [{ key: 'wiki', value: s.infobox }] : [],
      volumes: 0,
      eps: parseEps(s.infobox),
      total_episodes: parseEps(s.infobox),
      rating: {
        rank: s.rank || 0,
        total: totalRatings,
        score: s.score || 0,
        count: s.score_details || {},
      },
      collection: {
        wish: s.favorite?.wish || 0,
        collect: s.favorite?.done || 0,
        doing: s.favorite?.doing || 0,
        on_hold: s.favorite?.on_hold || 0,
        dropped: s.favorite?.dropped || 0,
      },
      tags: s.tags || [],
      meta_tags: s.meta_tags || [],
    })

    if (animeCount % 10000 === 0) {
      console.log(`  ${animeCount.toLocaleString()} anime subjects processed...`)
    }
  }
  console.log(`  ✓ ${subjectCount.toLocaleString()} total subjects, ${animeCount.toLocaleString()} anime\n`)

  // ─── Phase 3: Read episodes ───
  console.log('[3/5] Reading episode.jsonlines...')
  const episodeMap = new Map<number, any[]>()  // subject_id → episodes[]
  let epCount = 0

  for await (const line of lineStream(path.join(DUMP_DIR, 'episode.jsonlines'))) {
    if (!line.trim()) continue
    const ep: ArchiveEpisode = JSON.parse(line)
    epCount++
    if (ep.type !== 0) continue  // main episodes only

    const entry = {
      id: ep.id,
      sort: ep.sort,
      name: ep.name || '',
      name_cn: ep.name_cn || '',
      airdate: ep.airdate || '',
      duration: ep.duration || '',
      type: ep.type,
      desc: ep.description || '',
    }

    if (!episodeMap.has(ep.subject_id)) episodeMap.set(ep.subject_id, [])
    episodeMap.get(ep.subject_id)!.push(entry)

    if (epCount % 200000 === 0) {
      console.log(`  ${epCount.toLocaleString()} episodes processed...`)
    }
  }
  console.log(`  ✓ ${epCount.toLocaleString()} episodes, ${episodeMap.size.toLocaleString()} subjects with episodes\n`)

  // ─── Phase 4: Write output files ───
  console.log('[4/5] Writing cached JSON files...')

  // 4a. Seasonal JSON
  let seasonFileCount = 0
  for (const [key, subjects] of seasonMap) {
    // Sort by date ascending (same as existing behavior)
    subjects.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    writeJSON(path.join(SEASONS_DIR, `${key}.json`), subjects)
    seasonFileCount++
  }
  console.log(`  ✓ ${seasonFileCount} season files`)

  // 4b. Sharded subject detail cache
  const shards = new Map<number, Record<number, any>>()
  for (const [id, detail] of subjectDetails) {
    const start = Math.floor(id / SHARD_SIZE) * SHARD_SIZE
    if (!shards.has(start)) shards.set(start, {})
    const shard = shards.get(start)!
    shard[id] = {
      detail,
      episodes: episodeMap.get(id) || [],
      updatedAt: new Date().toISOString(),
    }
  }
  for (const [start, shard] of shards) {
    writeJSON(shardFile(start), shard)
  }
  console.log(`  ✓ ${shards.size} subject shard files`)

  // 4c. Stats
  const withDetail = subjectDetails.size
  const allIds = new Set<number>()
  for (const subjects of seasonMap.values()) {
    for (const s of subjects) allIds.add(s.id)
  }
  writeJSON(path.join(OUT_DIR, 'stats.json'), {
    totalSubjects: allIds.size,
    withDetail,
    updatedAt: new Date().toISOString(),
  })
  console.log(`  ✓ stats.json (${allIds.size} seasonal, ${withDetail} with details)`)

  // 4d. Seasons manifest
  const manifest: Record<string, number[]> = {}
  for (const key of seasonMap.keys()) {
    const [y, m] = key.split('-')
    if (!manifest[y]) manifest[y] = []
    manifest[y].push(parseInt(m, 10))
  }
  for (const y of Object.keys(manifest)) manifest[y].sort((a, b) => a - b)
  writeJSON(path.join(OUT_DIR, 'seasons-manifest.json'), manifest)
  console.log(`  ✓ seasons-manifest.json (${Object.keys(manifest).length} years)\n`)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`✅ Done in ${elapsed}s!`)
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
