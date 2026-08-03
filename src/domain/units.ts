import type { LengthUnit } from '../types'

const MM_PER_IN = 25.4
const MM_PER_FT = 304.8

export function toMm(value: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm':
      return value
    case 'in':
      return value * MM_PER_IN
    case 'ft':
      return value * MM_PER_FT
  }
}

export function fromMm(mm: number, unit: LengthUnit): number {
  switch (unit) {
    case 'mm':
      return mm
    case 'in':
      return mm / MM_PER_IN
    case 'ft':
      return mm / MM_PER_FT
  }
}

export function unitSymbol(unit: LengthUnit): string {
  return unit
}

export function formatCompact(mm: number, unit: LengthUnit): string {
  if (unit === 'in') return formatAsFraction(mm / MM_PER_IN)
  if (unit === 'ft') return formatAsFeetInches(mm, true)
  const v = mm
  if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v))
  return v.toFixed(1).replace(/\.0$/, '')
}

export function formatDim(mm: number, unit: LengthUnit): string {
  if (unit === 'in') return `${formatAsFraction(mm / MM_PER_IN)}"`
  if (unit === 'ft') return formatAsFeetInches(mm, false)
  return `${formatCompact(mm, 'mm')} mm`
}

export function formatSize(lengthMm: number, widthMm: number, unit: LengthUnit): string {
  return `${formatCompact(lengthMm, unit)}×${formatCompact(widthMm, unit)}`
}

/** Parse user input in the active unit (bare number) or with explicit suffixes. */
export function parseToMm(text: string, unit: LengthUnit): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const explicit = parseExplicit(trimmed)
  if (explicit != null) return explicit

  const n = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  return toMm(n, unit)
}

function parseExplicit(text: string): number | null {
  const t = text.trim()

  const feetInches = t.match(/^(\d+)\s*['′]\s*(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)?\s*["″]?$/)
  if (feetInches) {
    const feet = Number(feetInches[1])
    const inchPart = feetInches[2] ? parseInchFragment(feetInches[2]) : 0
    if (inchPart == null) return null
    return (feet * 12 + inchPart) * MM_PER_IN
  }

  const feetOnly = t.match(/^(\d+(?:[.,]\d+)?)\s*['′]\s*$/)
  if (feetOnly) {
    const feet = Number(feetOnly[1].replace(',', '.'))
    return feet * MM_PER_FT
  }

  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*["″]?$/)
  if (mixed) {
    return (Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])) * MM_PER_IN
  }

  const frac = t.match(/^(\d+)\s*\/\s*(\d+)\s*["″]?$/)
  if (frac) return (Number(frac[1]) / Number(frac[2])) * MM_PER_IN

  const withUnit = t.match(/^([+-]?\d+(?:[.,]\d+)?)\s*(mm|cm|m|ft|feet|in|inch|inches|["″])$/i)
  if (withUnit) {
    const n = Number(withUnit[1].replace(',', '.'))
    const s = withUnit[2].toLowerCase()
    if (s === 'mm') return n
    if (s === 'cm') return n * 10
    if (s === 'm') return n * 1000
    if (s === 'ft' || s === 'feet') return n * MM_PER_FT
    return n * MM_PER_IN
  }

  if (t.endsWith('"') || t.endsWith('″')) {
    const n = Number(t.slice(0, -1).trim().replace(',', '.'))
    if (Number.isFinite(n)) return n * MM_PER_IN
  }

  return null
}

function parseInchFragment(raw: string): number | null {
  const mixed = raw.trim().match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/)
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])
  const frac = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number(raw.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function formatAsFraction(inches: number): string {
  if (inches < 0) return `-${formatAsFraction(-inches)}`
  const whole = Math.floor(inches)
  const frac = inches - whole
  if (frac < 1 / 32) return whole === 0 ? '0' : String(whole)
  if (frac > 1 - 1 / 32) return String(whole + 1)

  let bestNum = 1
  let bestDen = 16
  let bestErr = Infinity
  for (const den of [2, 4, 8, 16]) {
    for (const n of [Math.floor(frac * den), Math.ceil(frac * den)]) {
      if (n < 0 || n > den) continue
      const err = Math.abs(frac - n / den)
      if (err < bestErr) {
        bestErr = err
        bestNum = n
        bestDen = den
      }
    }
  }
  if (bestNum === 0) return String(whole)
  if (bestNum === bestDen) return String(whole + 1)
  const g = gcd(bestNum, bestDen)
  const n = bestNum / g
  const d = bestDen / g
  return whole === 0 ? `${n}/${d}` : `${whole} ${n}/${d}`
}

function formatAsFeetInches(mm: number, compact: boolean): string {
  if (mm < 0) return `-${formatAsFeetInches(-mm, compact)}`
  const totalInches = Math.round((mm / MM_PER_IN) * 16) / 16
  let feet = Math.floor(totalInches / 12)
  let inches = totalInches - feet * 12
  if (inches >= 11.999) {
    feet += 1
    inches = 0
  }
  const inchPart = formatAsFraction(inches)
  if (feet === 0) {
    return compact
      ? inchPart === '0'
        ? "0'"
        : `${inchPart}"`
      : inchPart === '0'
        ? `0'0"`
        : `0'${inchPart}"`
  }
  const body = inchPart === '0' ? `${feet}'0` : `${feet}'${inchPart}`
  return compact ? body : `${body}"`
}

function gcd(a: number, b: number): number {
  let x = a
  let y = b
  while (y !== 0) {
    const t = x
    x = y
    y = t % y
  }
  return Math.max(x, 1)
}

export function displayValueForInput(mm: number, unit: LengthUnit): string {
  const v = fromMm(mm, unit)
  if (unit === 'mm') {
    return Math.abs(v - Math.round(v)) < 1e-6 ? String(Math.round(v)) : v.toFixed(1)
  }
  if (unit === 'in') {
    return Math.abs(v - Math.round(v * 1000) / 1000) < 1e-9
      ? String(Math.round(v * 1000) / 1000)
      : (Math.round(v * 1000) / 1000).toString()
  }
  return (Math.round(v * 1000) / 1000).toString()
}
