import type { CutItem, PartRole } from '../types'
import { createId } from '../types'
import { classifyLabel } from './cabinetAssembly'

export type CabinetTemplateId =
  | 'BASE_2_DOOR'
  | 'BASE_1_DOOR'
  | 'BASE_DRAWERS'
  | 'BASE_4_DRAWERS'
  | 'BASE_COMBO'
  | 'OPEN_BASE'
  | 'WALL_2_DOOR'
  | 'WALL_1_DOOR'
  | 'WALL_OPEN'
  | 'BOOKCASE'
  | 'TALL_PANTRY'
  | 'WARDROBE'
  | 'VANITY'
  | 'SHELVES_PANTRY'
  | 'SPICE_RACK'
  | 'BOX_FLAP_SHUTTER'
  | 'SINK_BOX'
  | 'HOB_BOX_3_DRAWERS'
  | 'CORNER_L'

export interface CabinetTemplateMeta {
  id: CabinetTemplateId
  displayName: string
  description: string
  requiresPremium: boolean
  /** Suggested outer W×H×D mm */
  defaults: { widthMm: number; heightMm: number; depthMm: number }
}

export const CABINET_TEMPLATES: CabinetTemplateMeta[] = [
  {
    id: 'BASE_2_DOOR',
    displayName: 'Base · 2 door',
    description: 'Floor cabinet — sides, top, bottom, back, shelf, toe kick, 2 doors',
    requiresPremium: false,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'BASE_1_DOOR',
    displayName: 'Base · 1 door',
    description: 'Narrow floor cabinet — full carcass, shelf, toe kick, single door',
    requiresPremium: false,
    defaults: { widthMm: 400, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'BASE_DRAWERS',
    displayName: 'Drawer base · 3',
    description: 'Base box + 3 drawer boxes + toe kick',
    requiresPremium: false,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'WALL_2_DOOR',
    displayName: 'Wall · 2 door',
    description: 'Wall cabinet — sides, top, bottom, back, shelf, 2 doors',
    requiresPremium: false,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 320 },
  },
  {
    id: 'WALL_1_DOOR',
    displayName: 'Wall · 1 door',
    description: 'Narrow wall cabinet — full carcass, shelf, single door',
    requiresPremium: false,
    defaults: { widthMm: 400, heightMm: 720, depthMm: 320 },
  },
  {
    id: 'BASE_4_DRAWERS',
    displayName: 'Drawer base · 4',
    description: 'Base box + 4 drawer boxes + toe kick',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'BASE_COMBO',
    displayName: 'Base · drawer + doors',
    description: 'Drawer box over split doors — carcass, shelf, toe kick',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'OPEN_BASE',
    displayName: 'Base · open',
    description: 'Open floor carcass — sides, top, bottom, back, shelf, toe kick',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'WALL_OPEN',
    displayName: 'Wall · open',
    description: 'Open wall box — sides, top, bottom, back, shelf',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 720, depthMm: 320 },
  },
  {
    id: 'BOOKCASE',
    displayName: 'Bookcase',
    description: 'Tall open bookcase — sides, top, bottom, back, 4 shelves',
    requiresPremium: true,
    defaults: { widthMm: 800, heightMm: 1800, depthMm: 300 },
  },
  {
    id: 'TALL_PANTRY',
    displayName: 'Tall pantry',
    description: 'Full-height pantry — carcass, 2 shelves, 2 doors',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 2100, depthMm: 560 },
  },
  {
    id: 'WARDROBE',
    displayName: 'Wardrobe',
    description: 'Tall wardrobe — carcass, center partition, 3 shelves, 2 doors',
    requiresPremium: true,
    defaults: { widthMm: 1200, heightMm: 2100, depthMm: 560 },
  },
  {
    id: 'VANITY',
    displayName: 'Vanity base',
    description: 'Vanity carcass — false drawer front, doors, shelf, toe kick',
    requiresPremium: true,
    defaults: { widthMm: 900, heightMm: 720, depthMm: 460 },
  },
  {
    id: 'SHELVES_PANTRY',
    displayName: 'Shelves pantry',
    description: 'Tall open pantry — sides, top, bottom, back, 5 shelves',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 2100, depthMm: 400 },
  },
  {
    id: 'SPICE_RACK',
    displayName: 'Spice rack',
    description: 'Narrow shallow unit — sides, top, bottom, back, 4 shelves',
    requiresPremium: true,
    defaults: { widthMm: 300, heightMm: 720, depthMm: 150 },
  },
  {
    id: 'BOX_FLAP_SHUTTER',
    displayName: 'Box · flap shutter',
    description: 'Carcass with tip-on / flap door front + shelf',
    requiresPremium: true,
    defaults: { widthMm: 600, heightMm: 400, depthMm: 320 },
  },
  {
    id: 'SINK_BOX',
    displayName: 'Sink box',
    description: 'Sink base — open top (rails), sides, bottom, back, shelf, toe kick, doors',
    requiresPremium: true,
    defaults: { widthMm: 800, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'HOB_BOX_3_DRAWERS',
    displayName: 'Hob box · 3 drawers',
    description: '900mm hob/base unit — 3 full drawer boxes + toe kick',
    requiresPremium: true,
    defaults: { widthMm: 900, heightMm: 720, depthMm: 560 },
  },
  {
    id: 'CORNER_L',
    displayName: 'Kitchen corner · L',
    description: 'L-corner base — dual bottoms/backs, partition, rails, shelves, toe kicks, doors',
    requiresPremium: true,
    defaults: { widthMm: 900, heightMm: 720, depthMm: 900 },
  },
]

export interface CabinetSpec {
  template: CabinetTemplateId
  widthMm: number
  heightMm: number
  depthMm: number
  thicknessMm: number
  materialType: string
  doorMaterial: string
  includeDoors: boolean
  grainOnSides: boolean
}

const TOE_KICK_H = 100

function roleFor(label: string): PartRole {
  const r = classifyLabel(label)
  return r === 'UNKNOWN' ? 'NONE' : r
}

function makePart(
  projectId: string,
  label: string,
  lengthMm: number,
  widthMm: number,
  quantity: number,
  materialType: string,
  opts: {
    grain?: boolean
    bandTop?: boolean
    bandBottom?: boolean
    bandLeft?: boolean
    bandRight?: boolean
  } = {},
): CutItem {
  const grain = opts.grain ?? false
  return {
    id: createId(),
    projectId,
    label,
    lengthMm,
    widthMm,
    quantity,
    materialType,
    grainLocked: grain,
    canRotate: !grain,
    partRole: roleFor(label),
    edgeBandTop: opts.bandTop ?? false,
    edgeBandBottom: opts.bandBottom ?? false,
    edgeBandLeft: opts.bandLeft ?? false,
    edgeBandRight: opts.bandRight ?? false,
  }
}

function isFloorBase(t: CabinetTemplateId): boolean {
  return (
    t === 'BASE_2_DOOR' ||
    t === 'BASE_1_DOOR' ||
    t === 'BASE_DRAWERS' ||
    t === 'BASE_4_DRAWERS' ||
    t === 'BASE_COMBO' ||
    t === 'OPEN_BASE' ||
    t === 'SINK_BOX' ||
    t === 'HOB_BOX_3_DRAWERS' ||
    t === 'VANITY'
  )
}

function drawerBoxParts(
  projectId: string,
  qty: number,
  frontH: number,
  frontW: number,
  innerW: number,
  depth: number,
  thickness: number,
  doorMat: string,
  boxMat: string,
): CutItem[] {
  const t = thickness
  const boxH = Math.max(t, frontH - 20)
  const boxD = Math.max(t, depth - 40)
  const boxOuterW = Math.max(t, innerW - 20)
  const boxInnerW = Math.max(t, boxOuterW - 2 * t)
  return [
    makePart(projectId, 'Drawer front', frontW, frontH, qty, doorMat, {
      grain: true,
      bandTop: true,
      bandBottom: true,
      bandLeft: true,
      bandRight: true,
    }),
    makePart(projectId, 'Drawer side', boxD, boxH, qty * 2, boxMat, {
      bandTop: true,
      bandBottom: true,
    }),
    makePart(projectId, 'Drawer back', boxInnerW, boxH, qty, boxMat, {
      bandTop: true,
      bandBottom: true,
    }),
    makePart(projectId, 'Drawer bottom', boxInnerW, Math.max(t, boxD - t), qty, 'MDF'),
  ]
}

export function generateCabinetParts(projectId: string, spec: CabinetSpec): CutItem[] {
  if (spec.template === 'CORNER_L') return generateCornerL(projectId, spec)

  const t = spec.thicknessMm
  const w = spec.widthMm
  const h = spec.heightMm
  const d = spec.depthMm
  const innerW = Math.max(t, w - 2 * t)
  const mat = spec.materialType
  const doorMat = spec.doorMaterial
  const parts: CutItem[] = []

  const add = (
    label: string,
    length: number,
    width: number,
    qty = 1,
    material = mat,
    opts: Parameters<typeof makePart>[6] = {},
  ) => {
    parts.push(makePart(projectId, label, length, width, qty, material, opts))
  }

  add('Left side', h, d, 1, mat, {
    grain: spec.grainOnSides,
    bandTop: true,
    bandBottom: true,
  })
  add('Right side', h, d, 1, mat, {
    grain: spec.grainOnSides,
    bandTop: true,
    bandBottom: true,
  })
  add('Bottom', innerW, d, 1, mat, {
    bandTop: true,
    bandBottom: true,
    bandLeft: true,
    bandRight: true,
  })

  if (spec.template === 'SINK_BOX') {
    const railW = Math.max(t, 80)
    add('Front rail', innerW, railW, 1, mat, {
      bandTop: true,
      bandBottom: true,
      bandLeft: true,
      bandRight: true,
    })
    add('Back rail', innerW, railW, 1, mat, {
      bandTop: true,
      bandBottom: true,
      bandLeft: true,
      bandRight: true,
    })
  } else {
    add('Top', innerW, d, 1, mat, {
      bandTop: true,
      bandBottom: true,
      bandLeft: true,
      bandRight: true,
    })
  }

  add('Back', innerW, Math.max(t, h - t), 1, 'MDF')

  if (spec.template === 'WARDROBE') {
    add('Partition', h, d, 1, mat, {
      grain: spec.grainOnSides,
      bandTop: true,
      bandBottom: true,
    })
  }

  const shelfD = Math.max(t, d - 20)
  const shelfQty: Partial<Record<CabinetTemplateId, number>> = {
    BASE_2_DOOR: 1,
    BASE_1_DOOR: 1,
    OPEN_BASE: 1,
    WALL_2_DOOR: 1,
    WALL_1_DOOR: 1,
    WALL_OPEN: 1,
    VANITY: 1,
    BASE_COMBO: 1,
    BOX_FLAP_SHUTTER: 1,
    SINK_BOX: 1,
    TALL_PANTRY: 2,
    WARDROBE: 3,
    BOOKCASE: 4,
    SHELVES_PANTRY: 5,
    SPICE_RACK: 4,
  }
  const sq = shelfQty[spec.template]
  if (sq) add('Shelf', innerW, shelfD, sq, mat, { bandTop: true })

  if (isFloorBase(spec.template)) {
    add('Toe kick', Math.max(t, w - 70), Math.max(t, TOE_KICK_H), 1, mat, { bandTop: true })
  }

  if (spec.includeDoors) {
    switch (spec.template) {
      case 'BASE_2_DOOR':
      case 'WALL_2_DOOR':
      case 'TALL_PANTRY':
      case 'WARDROBE':
      case 'SINK_BOX': {
        const doorH = Math.max(t, h - 4)
        const doorW = Math.max(t, w / 2 - 3)
        add('Door', doorH, doorW, 2, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        break
      }
      case 'BASE_1_DOOR':
      case 'WALL_1_DOOR': {
        add('Door', Math.max(t, h - 4), Math.max(t, w - 4), 1, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        break
      }
      case 'BOX_FLAP_SHUTTER': {
        add('Flap', Math.max(t, h - 4), Math.max(t, w - 4), 1, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        break
      }
      case 'VANITY': {
        add('Door', Math.max(t, h * 0.55), Math.max(t, w / 2 - 3), 2, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        add('False drawer front', Math.max(t, w - 4), Math.max(t, h * 0.35), 1, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        break
      }
      case 'BASE_COMBO': {
        const drawerH = Math.max(t, h * 0.28)
        const doorH = Math.max(t, h - drawerH - 8)
        const doorW = Math.max(t, w / 2 - 3)
        parts.push(
          ...drawerBoxParts(
            projectId,
            1,
            drawerH,
            Math.max(t, w - 4),
            innerW,
            d,
            t,
            doorMat,
            mat,
          ),
        )
        add('Door', doorH, doorW, 2, doorMat, {
          grain: true,
          bandTop: true,
          bandBottom: true,
          bandLeft: true,
          bandRight: true,
        })
        break
      }
      case 'BASE_DRAWERS':
      case 'HOB_BOX_3_DRAWERS': {
        parts.push(
          ...drawerBoxParts(
            projectId,
            3,
            Math.max(t, h / 3 - 4),
            Math.max(t, w - 4),
            innerW,
            d,
            t,
            doorMat,
            mat,
          ),
        )
        break
      }
      case 'BASE_4_DRAWERS': {
        parts.push(
          ...drawerBoxParts(
            projectId,
            4,
            Math.max(t, h / 4 - 4),
            Math.max(t, w - 4),
            innerW,
            d,
            t,
            doorMat,
            mat,
          ),
        )
        break
      }
      default:
        break
    }
  }

  return parts
}

function generateCornerL(projectId: string, spec: CabinetSpec): CutItem[] {
  const t = spec.thicknessMm
  const w = spec.widthMm
  const h = spec.heightMm
  const d = spec.depthMm
  const mat = spec.materialType
  const doorMat = spec.doorMaterial
  const legD = Math.max(t * 4, Math.min(560, Math.min(w, d) * 0.65))
  const parts: CutItem[] = []
  const add = (
    label: string,
    length: number,
    width: number,
    qty = 1,
    material = mat,
    opts: Parameters<typeof makePart>[6] = {},
  ) => {
    parts.push(makePart(projectId, label, length, width, qty, material, opts))
  }

  add('Left side', h, legD, 1, mat, { grain: spec.grainOnSides, bandTop: true, bandBottom: true })
  add('Right side', h, legD, 1, mat, { grain: spec.grainOnSides, bandTop: true, bandBottom: true })
  add('Partition', h, legD, 1, mat, { grain: spec.grainOnSides, bandTop: true, bandBottom: true })
  add('Bottom', Math.max(t, w - t), legD, 1, mat, {
    bandTop: true,
    bandBottom: true,
    bandLeft: true,
    bandRight: true,
  })
  add('Bottom', Math.max(t, d - legD), legD, 1, mat, {
    bandTop: true,
    bandBottom: true,
    bandLeft: true,
    bandRight: true,
  })
  add('Back', Math.max(t, w - t), Math.max(t, h - t), 1, 'MDF')
  add('Back', Math.max(t, d - legD - t), Math.max(t, h - t), 1, 'MDF')
  const railW = Math.max(t, 80)
  add('Front rail', Math.max(t, w - legD - t), railW, 1, mat, {
    bandTop: true,
    bandBottom: true,
    bandLeft: true,
    bandRight: true,
  })
  add('Front rail', Math.max(t, d - legD - t), railW, 1, mat, {
    bandTop: true,
    bandBottom: true,
    bandLeft: true,
    bandRight: true,
  })
  add('Shelf', Math.max(t, w - 2 * t), Math.max(t, legD - 20), 1, mat, { bandTop: true })
  add('Shelf', Math.max(t, d - legD - t), Math.max(t, legD - 20), 1, mat, { bandTop: true })
  add('Toe kick', Math.max(t, w - 70), Math.max(t, TOE_KICK_H), 1, mat, { bandTop: true })
  add('Toe kick', Math.max(t, d - 70), Math.max(t, TOE_KICK_H), 1, mat, { bandTop: true })
  if (spec.includeDoors) {
    add('Door', Math.max(t, h - 4), Math.max(t, legD - 4), 2, doorMat, {
      grain: true,
      bandTop: true,
      bandBottom: true,
      bandLeft: true,
      bandRight: true,
    })
  }
  return parts
}
