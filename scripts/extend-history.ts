/**
 * Local-only script: extend seasonal data backwards from current earliest year.
 * Fetches year by year until a year with zero data is found.
 * Then updates minYear in source code and commits cached data to git.
 *
 * Usage: npx tsx scripts/extend-history.ts
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const BGM = 'https://api.bgm.tv'
const SEASONS_DIR = path.join('public', 'data', 'seasons')

// ─── Helpers ───

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`)
  return res.json()
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

interface SubjectPage {
  data: any[]
  total: number
}

async function fetchAllSubjects(year: number, month: number) {
  const all: any[] = []
  let offset = 0
  while (true) {
    const params = new URLSearchParams({
      type: '2', sort: 'date',
      year: String(year), month: String(month),
      limit: '50', offset: String(offset),
    })
    const data = await fetchJSON<SubjectPage>(`${BGM}/v0/subjects?${params}`)
    if (!data.data?.length) break
    all.push(...data.data)
    if (data.data.length < 50) break
    offset += 50
    await sleep(300)
  }
  return all
}

function writeJSON(filePath: string, data: any) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data))
}

// ─── Main ───

async function main() {
  ensureDir(SEASONS_DIR)

  // Find current earliest cached year
  let currentMinYear = 2000
  if (fs.existsSync(SEASONS_DIR)) {
    const years: number[] = []
    for (const file of fs.readdirSync(SEASONS_DIR)) {
      const match = file.match(/^(\d{4})-\d{2}\.json$/)
      if (match) years.push(parseInt(match[1]))
    }
    if (years.length > 0) currentMinYear = Math.min(...years)
  }

  console.log(`📦 Earliest cached year: ${currentMinYear}`)
  console.log(`🔍 Scanning backwards from ${currentMinYear - 1}...\n`)

  let newMinYear = currentMinYear
  const newFiles: string[] = []

  for (let y = currentMinYear - 1; y >= 1900; y--) {
    let yearHasData = false

    for (let m = 1; m <= 12; m++) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      const filePath = path.join(SEASONS_DIR, `${key}.json`)

      if (fs.existsSync(filePath)) {
        yearHasData = true
        continue
      }

      try {
        const subjects = await fetchAllSubjects(y, m)
        if (subjects.length > 0) {
          writeJSON(filePath, subjects)
          newFiles.push(`public/data/seasons/${key}.json`)
          yearHasData = true
          console.log(`  ✓ ${key}: ${String(subjects.length).padStart(4)} subjects`)
        }
      } catch (e) {
        console.error(`  ✗ ${key}: ${(e as Error).message}`)
      }
      await sleep(500)
    }

    if (!yearHasData) {
      console.log(`\n🛑 Year ${y} has no data — stopping.`)
      newMinYear = y + 1
      break
    }

    newMinYear = y
    console.log(`  ── Year ${y} done ──\n`)
    await sleep(500)
  }

  if (newMinYear >= currentMinYear) {
    console.log('✅ No new years found. Already at earliest available data.')
    return
  }

  console.log(`\n📝 New earliest year: ${newMinYear}`)
  console.log(`📁 ${newFiles.length} new season files cached`)

  // ─── Update source files ───

  const updates: { file: string; pattern: RegExp }[] = [
    { file: 'scripts/fetch-data.ts',    pattern: /const startYear\s*=\s*\d+/ },
    { file: 'src/api/bangumi.ts',       pattern: /const startYear\s*=\s*\d+/ },
    { file: 'src/components/YearMonthPicker.vue', pattern: /const minYear\s*=\s*\d+/ },
  ]

  for (const { file, pattern } of updates) {
    const content = fs.readFileSync(file, 'utf-8')
    if (file.endsWith('.vue')) {
      const updated = content.replace(pattern, `const minYear = ${newMinYear}`)
      fs.writeFileSync(file, updated)
    } else {
      const updated = content.replace(pattern, `const startYear = ${newMinYear}`)
      fs.writeFileSync(file, updated)
    }
    console.log(`  ✓ Updated ${file}`)
  }

  // ─── Git commit ───

  console.log('\n📤 Committing to git...')
  execSync(`git add public/data/seasons/ ${updates.map(u => u.file).join(' ')}`, { stdio: 'inherit' })
  execSync(`git commit -m "data: extend seasonal coverage back to ${newMinYear}"`, { stdio: 'inherit' })
  console.log('✅ Committed!')
}

main().catch((e) => {
  console.error('❌ Fatal:', e)
  process.exit(1)
})
