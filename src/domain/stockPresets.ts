export interface StockSizePreset {
  id: string
  lengthMm: number
  widthMm: number
  shortName: string
}

const NA_4X8_L = 96 * 25.4
const NA_4X8_W = 48 * 25.4
const NA_4X4 = 48 * 25.4

export const STOCK_PRESETS: StockSizePreset[] = [
  { id: 'euro_full', lengthMm: 2440, widthMm: 1220, shortName: 'Euro full' },
  { id: 'metric_2400', lengthMm: 2400, widthMm: 1200, shortName: '2400×1200' },
  { id: 'na_4x8', lengthMm: NA_4X8_L, widthMm: NA_4X8_W, shortName: '4×8 ft' },
  { id: 'euro_half', lengthMm: 1220, widthMm: 1220, shortName: 'Euro half' },
  { id: 'na_4x4', lengthMm: NA_4X4, widthMm: NA_4X4, shortName: '4×4 ft' },
  { id: 'euro_strip', lengthMm: 2440, widthMm: 610, shortName: 'Half width' },
  { id: 'melamine', lengthMm: 2800, widthMm: 2070, shortName: 'Melamine' },
  { id: 'long_sheet', lengthMm: 3050, widthMm: 1220, shortName: 'Long sheet' },
]
