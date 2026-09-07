# Live data: what works without a key, and what does not

The build makes **no network requests by default**. Two optional sources can be switched
on in the head unit under **Settings → Live data**, and both were chosen because they
need no API key and no account — the only way an opt-in switch in a public repo works for
whoever clones it.

## Working now, no key required

### Radio — Radio Browser

A community-run directory of internet radio streams.

| | |
|---|---|
| Endpoint | `https://de1.api.radio-browser.info/json/stations/topvote/24` |
| Key | None |
| CORS | Enabled |
| Cost | Free, donation funded |
| Returns | Station name, a directly playable `url_resolved`, codec, bitrate, tags |

Switch on **Live radio stations** and the FM presets are replaced by real, playable
stations. The other sources keep their offline lists, because only FM has a real-world
analogue in the directory.

**One honest limitation.** Live streams play through a plain `<audio>` element and
therefore bypass the equaliser, balance and speed compensation. Routing them through the
WebAudio graph needs `createMediaElementSource`, which requires the stream to send
permissive CORS headers, and most public stations do not. Muting the radio to preserve an
EQ nobody asked for would be the wrong trade, so the DSP demonstrates on the synthesised
programme material instead and the UI says so.

### Maps — OpenStreetMap raster tiles

| | |
|---|---|
| Endpoint | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Key | None |
| Cost | Free |
| Attribution | Required, and shown on the map |

Switch on **Live map tiles** and real tiles are drawn under the route. The build requests
a fixed 5×3 block for one view, not a pannable map: the interaction being demonstrated is
*zoom to a junction*, and the OSM tile servers are
[donated infrastructure](https://operations.osmfoundation.org/policies/tiles/) that should
not be asked for more than the view needs. If this ever became a real product, the correct
move is a commercial tile host, not heavier use of OSM's.

## If you want Google Maps or a commercial tile host

All of these need an account, a key, and a billing method on file. None are wired up —
adding one is a small change to `src/infotainment/liveData.ts`.

### Google Maps JavaScript API

1. Go to <https://console.cloud.google.com/> and create a project.
2. Enable **Maps JavaScript API** (and **Directions API** if you want real routing).
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Restrict the key immediately: *Application restrictions → Websites*, listing your
   domain and `localhost`. An unrestricted Maps key found in a public repo gets used by
   somebody else and billed to you.
5. Billing must be enabled. Google gives a recurring monthly credit that covers light
   development use; past it, Dynamic Maps bills per thousand loads.
6. Put the key in `.env.local` as `VITE_GOOGLE_MAPS_KEY` and read it via
   `import.meta.env`. **Never commit it** — `.env.local` is already gitignored.

Worth knowing: a `VITE_`-prefixed variable is bundled into the client and is readable by
anyone who opens dev tools. That is unavoidable for a browser Maps key, which is exactly
why the referrer restriction in step 4 is the real protection.

### Mapbox

Free tier is generous (~50k map loads/month). Sign up at <https://account.mapbox.com/>,
create a public token, restrict it by URL. Pairs well with `maplibre-gl`, which is the
open fork and needs no Mapbox account if you point it at another tile source.

### TomTom / HERE

Both offer free developer tiers with real traffic data, which is the one thing OSM tiles
cannot give you. Sensible if you ever want the traffic layer this build fakes.

## What is still simulated, and would stay simulated

Live sources would not change these, because no public API provides them:

- Vehicle signals — speed, rpm, fuel, tyre pressure, warnings. A real car publishes these
  on CAN; a browser cannot see them. The simulation *is* the vehicle.
- Surround-view tracks. A real system fuses four cameras and ultrasonic sensors.
- Turn-by-turn guidance along the demo route. Real routing needs a Directions API and a
  real GPS fix.
