import { useEffect, useRef, useState } from 'react'
import { useLiveDataStore } from '../state/liveDataStore'
import { fetchLiveStations } from './liveData'
import type { LiveStation } from './liveData'
import { useAudioStore } from '../state/audioStore'

/**
 * Live stations, and the element that plays them.
 *
 * The stream is played through a plain `<audio>` element rather than the
 * WebAudio graph. Routing it through `createMediaElementSource` would let the
 * equaliser and balance apply to real radio, which would be the better answer —
 * but it requires the stream to send permissive CORS headers, and most public
 * stations do not. Silently muting the radio for the sake of an EQ nobody asked
 * for would be the wrong trade, so live streams bypass the graph and the DSP
 * demonstrates on the synthesised programme instead. That limit is stated in
 * the UI rather than hidden.
 */
export function useLiveStations() {
  const enabled = useLiveDataStore((s) => s.radio)
  const setError = useLiveDataStore((s) => s.setError)
  const [stations, setStations] = useState<LiveStation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const source = useAudioStore((s) => s.source)
  const index = useAudioStore((s) => s.stationIndex)
  const playing = useAudioStore((s) => s.playing)
  const muted = useAudioStore((s) => s.muted)
  const volume = useAudioStore((s) => s.volume)

  useEffect(() => {
    if (!enabled) {
      setStations(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    fetchLiveStations(8, controller.signal)
      .then((list) => {
        setStations(list)
        setError(null)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setStations(null)
        setError(
          err instanceof Error
            ? `Live radio unavailable: ${err.message}`
            : 'Live radio unavailable.',
        )
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [enabled, setError])

  // Drive the audio element from the same store the rest of the UI uses.
  useEffect(() => {
    const live = enabled && source === 'fm' && stations?.length
    if (!live) {
      audioRef.current?.pause()
      return
    }
    const station = stations[index % stations.length]
    let el = audioRef.current
    if (!el) {
      el = new Audio()
      el.preload = 'none'
      audioRef.current = el
    }
    if (el.src !== station.streamUrl) el.src = station.streamUrl
    el.volume = muted ? 0 : volume
    if (playing) void el.play().catch(() => undefined)
    else el.pause()
  }, [enabled, source, stations, index, playing, muted, volume])

  useEffect(() => () => audioRef.current?.pause(), [])

  return { stations, loading, live: enabled && stations !== null }
}
