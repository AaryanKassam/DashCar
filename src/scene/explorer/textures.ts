import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three'

/**
 * Canvas-drawn textures for detail that is not worth modelling.
 *
 * The rule applied here: if it has to move, light up or be clicked, it is
 * geometry; if it is a marking on a surface, it is a texture. Speaker
 * perforations, the EXPLORER emboss, mirror warning text and the shifter's
 * P-R-N-D-S ring are all markings — extruding them would multiply the triangle
 * count for something the camera can never get close enough to interrogate.
 *
 * Textures are cached by their arguments, because a trim swap re-renders the
 * whole cabin and regenerating a dozen canvases every time is exactly the sort
 * of thing that turns a smooth theme change into a visible hitch.
 */

const cache = new Map<string, CanvasTexture>()

function draw(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  paint(ctx)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = LinearFilter
  cache.set(key, texture)
  return texture
}

/** Perforated speaker grille — a staggered dot field. */
export function speakerGrille(base: string): CanvasTexture {
  return draw(`grille:${base}`, 256, 256, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const pitch = 16
    for (let y = 0; y < 256; y += pitch) {
      for (let x = 0; x < 256; x += pitch) {
        const offset = (y / pitch) % 2 === 0 ? 0 : pitch / 2
        ctx.beginPath()
        ctx.arc(x + offset, y, 3.4, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
}

/**
 * Letter-spaced badge text, drawn light-on-dark so it reads as a raised emboss
 * catching the light rather than as printed ink.
 */
export function badge(text: string, ink: string, background: string): CanvasTexture {
  return draw(`badge:${text}:${ink}:${background}`, 1024, 128, (ctx) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 1024, 128)
    ctx.font = '600 58px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.letterSpacing = '26px'
    // A dark shadow above and a light face below fakes a chamfer under the
    // scene's overhead key light.
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillText(text, 512, 62)
    ctx.fillStyle = ink
    ctx.fillText(text, 512, 66)
  })
}

/** The legally-required line on the passenger door mirror. */
export function mirrorWarning(): CanvasTexture {
  return draw('mirror-warning', 512, 256, (ctx) => {
    ctx.fillStyle = '#b9bec4'
    ctx.fillRect(0, 0, 512, 256)
    // A faint vertical gradient so the glass is not a flat grey card.
    const g = ctx.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(120,130,140,0.35)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 512, 256)

    ctx.fillStyle = 'rgba(30,34,38,0.72)'
    ctx.font = '600 19px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.letterSpacing = '1px'
    ctx.fillText('OBJECTS IN MIRROR ARE', 256, 214)
    ctx.fillText('CLOSER THAN THEY APPEAR', 256, 238)
  })
}

/** Vertical stripe pattern on the seat centre panels. */
export function seatStripe(base: string): CanvasTexture {
  const texture = draw(`seat:${base}`, 128, 128, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 6, 128)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (let x = 0; x < 128; x += 16) ctx.fillRect(x + 7, 0, 2, 128)
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  return texture
}

/** P-R-N-D-S ring around the rotary shifter. */
export function shifterRing(ink: string, accent: string, background: string): CanvasTexture {
  return draw(`shifter:${ink}:${accent}:${background}`, 512, 512, (ctx) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 512, 512)

    const labels = ['P', 'R', 'N', 'D', 'S']
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '700 40px system-ui, -apple-system, sans-serif'
    labels.forEach((label, i) => {
      // Spread across the forward arc, the way a rotary selector is marked.
      const angle = -Math.PI / 2 + (i - 2) * 0.52
      const x = 256 + Math.cos(angle) * 186
      const y = 256 + Math.sin(angle) * 186
      ctx.fillStyle = label === 'P' ? accent : ink
      ctx.fillText(label, x, y)
    })

    // Knurled outer band.
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 3
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(256 + Math.cos(a) * 232, 256 + Math.sin(a) * 232)
      ctx.lineTo(256 + Math.cos(a) * 248, 256 + Math.sin(a) * 248)
      ctx.stroke()
    }
  })
}

/**
 * Glyphs for a steering-wheel spoke pad.
 *
 * Left pad carries cruise and lane-keeping, right pad media and menu — the
 * split every modern Ford uses, and worth copying because a driver reaches for
 * these without looking.
 */
export function spokeButtons(side: 'left' | 'right', background: string): CanvasTexture {
  return draw(`spoke:${side}:${background}`, 512, 320, (ctx) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 512, 320)

    const glyphs =
      side === 'left'
        ? [
            ['⌁', '≡'],
            ['+', '−'],
            ['◂', '▸'],
          ]
        : [
            ['◀◀', '▶▶'],
            ['+', '−'],
            ['☎', '⏎'],
          ]

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    glyphs.forEach((row, r) => {
      row.forEach((glyph, c) => {
        const x = 128 + c * 256
        const y = 62 + r * 98
        // Recessed key: dark well, light glyph.
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        roundRect(ctx, x - 92, y - 38, 184, 76, 16)
        ctx.fill()
        ctx.fillStyle = 'rgba(226,230,236,0.9)'
        ctx.font = '600 40px system-ui, -apple-system, sans-serif'
        ctx.fillText(glyph, x, y + 2)
      })
    })
  })
}

/** Window and lock switch cluster on a door card. */
export function windowSwitches(background: string): CanvasTexture {
  return draw(`windows:${background}`, 512, 384, (ctx) => {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 512, 384)

    // Four window rockers in the familiar 2 x 2 with the driver's pair larger.
    const keys: [number, number, number, number][] = [
      [40, 60, 190, 96],
      [270, 60, 170, 96],
      [40, 190, 190, 96],
      [270, 190, 170, 96],
    ]
    keys.forEach(([x, y, w, h]) => {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      roundRect(ctx, x, y, w, h, 14)
      ctx.fill()
      ctx.fillStyle = 'rgba(190,196,204,0.5)'
      roundRect(ctx, x + 18, y + h / 2 - 6, w - 36, 12, 6)
      ctx.fill()
    })

    // Lock pair along the bottom.
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    roundRect(ctx, 40, 314, 120, 48, 12)
    ctx.fill()
    roundRect(ctx, 180, 314, 120, 48, 12)
    ctx.fill()
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * A stylised blue oval for the wheel hub.
 *
 * Hand-drawn approximation, not the real mark — this is a portfolio study and
 * the README says so. It is here because the badge is the single fastest cue
 * that tells a viewer which cabin they are sitting in.
 */
export function hubOval(): CanvasTexture {
  return draw('hub-oval', 512, 256, (ctx) => {
    ctx.clearRect(0, 0, 512, 256)

    const ellipse = (cx: number, cy: number, rx: number, ry: number) => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    }

    // Chrome surround, then the blue field inside it.
    ellipse(256, 128, 238, 116)
    ctx.fillStyle = '#c9ced4'
    ctx.fill()
    ellipse(256, 128, 226, 105)
    ctx.fillStyle = '#0b3d91'
    ctx.fill()

    // Inner keyline.
    ellipse(256, 128, 206, 88)
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 5
    ctx.stroke()

    ctx.fillStyle = '#f2f5f8'
    ctx.font = 'italic 700 96px Georgia, "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Ford', 256, 134)
  })
}

/**
 * Tileable leather grain, as a height field.
 *
 * Used as a bump map on the dash top, the wheel rim and the seat facings. This
 * is the single biggest thing separating a render that reads as a photographed
 * interior from one that reads as CAD: real interior surfaces are never
 * perfectly smooth, and a flat matte plane under soft studio light has no
 * information in it at all. The grain does not need to be visible as grain —
 * it needs to break up the specular response so the surface has a texture the
 * eye can land on.
 */
export function leatherGrain(scale = 1): CanvasTexture {
  const texture = draw(`leather:${scale}`, 512, 512, (ctx) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 512, 512)

    // Pebbled cells: overlapping soft blobs at two frequencies.
    for (const [count, radius, alpha] of [
      [2600, 7, 0.055],
      [900, 15, 0.04],
    ] as const) {
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 512
        const y = Math.random() * 512
        const r = radius * (0.5 + Math.random())
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        const light = Math.random() > 0.5
        g.addColorStop(0, `rgba(${light ? 255 : 0},${light ? 255 : 0},${light ? 255 : 0},${alpha})`)
        g.addColorStop(1, 'rgba(128,128,128,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(scale, scale)
  return texture
}

/**
 * Woven textile, for the light insert panels.
 *
 * The reference cabin's pale panels are fabric, not painted plastic — you can
 * read the weave on the passenger dash and the door cards. Rendering them as a
 * flat colour is the main reason the first pass looked moulded, and no amount
 * of colour correction fixes it, because the missing information is texture
 * rather than hue.
 */
export function wovenFabric(base: string, tint = '#ffffff'): CanvasTexture {
  const texture = draw(`woven:${base}:${tint}`, 256, 256, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 256, 256)

    const pitch = 4
    // Warp and weft, offset so the over-under alternates like a real weave.
    // Low contrast on purpose: at arm's length real cloth is close to
    // sub-pixel, and a weave you can actually resolve reads as diamond plate.
    for (let y = 0; y < 256; y += pitch) {
      for (let x = 0; x < 256; x += pitch) {
        const over = ((x / pitch + y / pitch) % 2) === 0
        ctx.fillStyle = over ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'
        if (over) ctx.fillRect(x, y, pitch - 1, pitch - 2)
        else ctx.fillRect(x, y, pitch - 2, pitch - 1)
      }
    }

    // Fibre noise on top, so the weave is not a perfect grid.
    ctx.fillStyle = tint
    ctx.globalAlpha = 0.03
    for (let i = 0; i < 5000; i++) {
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5)
    }
    ctx.globalAlpha = 1
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(14, 14)
  return texture
}

/** Height field matching `wovenFabric`, for its bump map. */
export function wovenBump(): CanvasTexture {
  const texture = draw('woven-bump', 256, 256, (ctx) => {
    ctx.fillStyle = '#808080'
    ctx.fillRect(0, 0, 256, 256)
    const pitch = 4
    for (let y = 0; y < 256; y += pitch) {
      for (let x = 0; x < 256; x += pitch) {
        const over = ((x / pitch + y / pitch) % 2) === 0
        ctx.fillStyle = over ? '#a0a0a0' : '#606060'
        if (over) ctx.fillRect(x, y, pitch - 1, pitch - 2)
        else ctx.fillRect(x, y, pitch - 2, pitch - 1)
      }
    }
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(14, 14)
  return texture
}

/** Perforation pattern for seat centre panels. */
export function perforation(base: string): CanvasTexture {
  const texture = draw(`perf:${base}`, 128, 128, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = 'rgba(0,0,0,0.42)'
    for (let y = 6; y < 128; y += 14) {
      for (let x = 6; x < 128; x += 14) {
        const offset = ((y - 6) / 14) % 2 === 0 ? 0 : 7
        ctx.beginPath()
        ctx.arc(x + offset, y, 2.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  })
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(3, 3)
  return texture
}

/**
 * A legend for one wheel switch.
 *
 * Only legible once the camera has come to the wheel, which is the point: at
 * driving distance these read as texture, and close up they read as controls.
 * Real switch caps are marked the same way and for the same reason.
 */
export function keyLegend(text: string, ink = '#c9ced6'): CanvasTexture {
  return draw(`key:${text}:${ink}`, 256, 128, (ctx) => {
    ctx.clearRect(0, 0, 256, 128)
    ctx.fillStyle = ink
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const size = text.length > 4 ? 44 : text.length > 3 ? 52 : 62
    ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`
    ctx.letterSpacing = '2px'
    ctx.fillText(text, 128, 68)
  })
}
