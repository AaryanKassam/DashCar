# Visual target — 2025 Ford Explorer Active

What the build is aiming at, derived from the reference material in `reference/`.
Recorded here so future sessions do not have to re-derive it from the images.

> **Unaffiliated portfolio recreation.** Not a Ford product. The vehicle likeness,
> "Explorer", "Ford" and the Ford oval belong to Ford Motor Company. Reference images
> are Ford's, kept in `reference/` for development only and excluded from the build.

## Source material

| File | What it shows |
|---|---|
| `reference/configurator-interior.png` | **The primary target.** Interior 360 default frame, 2936×1256 |
| `reference/configurator-exterior.png` | Exterior turntable frame, studio backdrop, both overlay controls |
| `reference/gallery-st-interior.png` | ST trim: seat construction, red contrast piping, red night ambient |
| `reference/trim-card-active.png` | Trim dropdown card styling |

### Missing: the two screen recordings

The prompt referenced two screen recordings (`2_20_04` exterior turntable, `2_20_48`
interior 360). **They never reached the filesystem** — only the four PNGs did — and
`ffmpeg` is not installed on this machine, so no frames could be extracted.

The camera section below is therefore built to the *written* specification in the prompt
rather than measured off the video. Every number in it is a stated requirement, not an
observation. If the recordings turn up later, the numbers to re-check are marked
**[unverified]**.

## Camera

The interior view is **not** an orbit control and **not** a free-fly camera. It is a
fixed nodal point that rotates in place. The camera never translates while panning —
the framing tightens and the view rotates, but parallax stays fixed.

| Property | Value |
|---|---|
| Anchor | Between the front seats, headrest height, slightly forward of the seatbacks. Centred laterally on the console, at driver-eye elevation |
| Default pose | Wheel + cluster left of centre, centre screen right of centre, both mirrors at the edges, rearview mirror at the top |
| Yaw | ±75°, driver door card to passenger door card. Does **not** reach the back seats **[unverified]** |
| Pitch | ±20°, clamped. Enough to see the console and shifter, or the mirror and headliner. Never enough to lose the dashboard **[unverified]** |
| Zoom | FOV narrowing 75° → 35°. **Not** a dolly **[unverified]** |
| Feel | Damped, inertial, ease-out on release. Soft stop at the clamps — no snap, no bounce |
| Cursor | `grab` / `grabbing` |

Exterior is a separate rig: azimuth-only turntable about the vehicle centre, fixed
elevation slightly above the beltline, same inertial feel, default 3/4 front. No pitch,
no zoom.

Named poses live in `src/scene/camera/rig.ts`: `interiorDefault`, `infotainmentFocus`,
`clusterFocus`, `driving`, `exteriorTurntable`.

**Built values, after tuning against the interior reference:**

| | |
|---|---|
| Eye point | `[-0.14, 1.28, 0.05]` m, biased 14 cm toward the driver |
| Rest pitch | -6.5° |
| Drag | 0.0042 rad/px yaw, 0.0034 rad/px pitch, grab-the-world direction |
| Follow / glide | exponential follow at 15/s, release decay 3.4/s |
| Driving yaw limit | 75° at rest, closing to 22° by 60 km/h |

### Framing note

The reference interior frame is 2.34:1 — an ultra-wide crop. A browser window is nearer
1.7–1.9:1. At the same vertical FOV a narrower viewport shows more headliner and
footwell and slightly less of the door cards. The build matches the *horizontal* extent
of the reference (both mirrors in frame) and accepts the extra vertical.

## Cabin layout

Read left to right off `configurator-interior.png`.

- **Driver door card** — dark charcoal padded upper; satin horizontal grab handle; window
  switch cluster (four window buttons plus mirror control); lock pair above it; light
  greige lower with a satin strip running diagonally; speaker grille.
- **Driver mirror** — seen through the glass, housing in body colour, pale grey glass.
- **A-pillars** — dark charcoal, steeply raked, thick enough to occlude.
- **Steering wheel** — three-spoke. Horizontal left/right spoke pads with button clusters
  (cruise and lane-keep left, media and menu right). Lower spoke carries a satin U-shaped
  insert. Blue Ford oval at the centre. Orange-red contrast stitching on the rim, clearly
  visible along the top arc. Lower rim slightly flattened.
- **Digital cluster** — wide letterbox panel behind the wheel, visible through the upper
  wheel opening. Large speed numeral left of centre, vehicle graphic centre, dial right,
  thin media-info strip along the top edge.
- **Upper dash** — dark charcoal padded, visible stitch line along the front edge, raised
  cowl over the cluster.
- **Centre touchscreen** — large landscape panel, floating proud of the fascia and mounted
  high, angled slightly toward the driver. Vertical icon rail down the left edge; map
  filling the centre; media card with album art on the right; persistent bottom bar with
  dual-zone temperatures, AUTO, seat heat, defrost, volume.
- **EXPLORER** embossed on the passenger-side satin strip, letter-spaced caps, subtle.
- **Below the screen** — horizontal vent bar, then a physical control strip (hazards,
  media transport, defrost, park assist) with a rotary knob at its left end.
- **Centre console** — rotary shifter with P-R-N-D-S markings, two cupholders, wireless
  charge pad forward of the shifter, engine start-stop to the right of the column.
- **Passenger door card** — mirror of the driver side. The passenger mirror carries
  OBJECTS IN MIRROR ARE CLOSER THAN THEY APPEAR.
- **Rearview mirror** — frameless, dark, top centre.
- **Seats** — dark grey fabric, vertically striped centre panels, smooth bolsters, red
  contrast piping. Visible in the bottom corners of the default frame.
- **Beyond the glass** — flat overcast grey in configurator mode. No scene, no horizon.

## Materials

| Surface | Treatment |
|---|---|
| Upper dash, door uppers, pillars | Dark charcoal, matte, roughness 0.92, metalness 0.02 |
| Lower fascia, door lowers, console flanks | Warm greige, satin, roughness 0.68 |
| Trim strips, handles, shifter ring, vent blades | Satin metal, roughness 0.44, metalness 0.55. Satin, not chrome |
| Screens | Near-black gloss, roughness ~0.12, faint reflection layer |
| Seats | Dark grey fabric, roughness 0.95, vertical stripe on the centre panels |
| Stitching / piping | Muted orange-red. Drawn as discrete instanced segments, not a continuous strip, or it reads as a light bar rather than thread |
| Carpet, footwells | Near-black, fully matte |
| Headliner | Mid warm grey |

Per-trim values live in `src/cars/explorer/trims.ts`; the treatments above are the
seven named surfaces in `src/scene/explorer/materials.ts`. Only Active is dialled in
against the reference — the other four trims are plausible, not verified.

## Lighting

Configurator mode is a neutral studio: soft, diffuse, keyed from above and through the
glass, with a flat overcast grey beyond the windows. Soft ambient occlusion in the
footwells and under the dash lip. No hard shadows, no coloured bounce.

Driving mode swaps in the existing time-of-day palette (`scene/lighting.ts`) and the
scrolling road. Night driving dims the cluster and the centre screen and brings up the
ambient strips — red for ST, per `gallery-st-interior.png`; each trim carries its own
ambient colour.

## Overlay chrome

Both controls sit over the render and follow the configurator's restrained styling.

- **Trim pill**, top-left, ~4.5% in from the left and ~5% down. Rounded rect, light
  translucent surface, bold dark label with a chevron. Opens a dropdown listing
  Active / ST-Line / Tremor / ST / Platinum.
- **Segmented toggle**, bottom-left, same left inset. `Exterior` / `Interior`. The active
  segment is a solid dark pill.

  *Discrepancy worth knowing:* in the exterior reference the container reads light with a
  dark active pill; in the interior reference it reads dark with a light active pill —
  the real control appears to adapt to the backdrop behind it. The build follows the
  written spec (light container, dark active pill) consistently in both modes, because a
  control that inverts itself as you switch views is harder to read, not easier.

## Where the build falls short of the reference

Recorded honestly, because the next session should know what to spend time on
rather than rediscovering it.

1. **The greige fascia still reads a shade light and slightly olive** next to the
   reference's warm mid-grey. It has been darkened three times; what it probably
   needs is a proper albedo/roughness pair and a warmer key rather than another
   hex nudge.
2. **The seats are barely in frame from the default pose.** They sit beside the
   camera rather than in front of it, so at a browser's aspect ratio only their
   front corners clip the bottom edge. The reference shows more of them; it is
   framed at 2.34:1, which is not a shape a browser window takes.
3. **The steering wheel is cruder than the reference** — the spoke pads are flat
   plates and the hub is a rounded box. It reads correctly in silhouette but does
   not hold up when the camera zooms onto it.
4. **The exterior body is proportional, not photographic.** Deliberately: it never
   animates or responds, so it was built to read in silhouette and stop. The
   greenhouse-to-body transition and the rear quarter are its weakest areas.
5. **The console is present but sparse** — shifter, cupholders and charge pad
   exist, but only the forward end is in frame from the nodal point.

## What is modelled vs. faked

Everything listed under **Cabin layout** is real geometry, because nearly all of it has
to animate, light up or respond to input at some point.

Baked into textures or shaders rather than modelled:

- Door speaker grille perforations — a procedural dot pattern
- Seat centre-panel stripe — a shader stripe, not modelled ribs
- Mirror text (OBJECTS IN MIRROR…) — a canvas texture
- EXPLORER embossing — a canvas texture with a normal-ish highlight, not extruded letters
- Steering wheel button glyphs — canvas textures on the spoke pads
- Rotary shifter P-R-N-D-S markings — canvas texture on the console
- Headliner weave and carpet pile — roughness only, no normal map

Nothing is a photo backplate. There is no image-sequence pan anywhere.
