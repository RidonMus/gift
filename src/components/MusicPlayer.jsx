import React, { useCallback, useEffect, useRef, useState } from 'react'

/* ---------------------------------------------------------------------------
 * "It's You" — Henry Lau. Our first dance.
 *
 * This has to be a YouTube iframe rather than an <audio> tag: YouTube does not
 * serve a plain audio file, and pulling one out would break their terms. The
 * official IFrame API is the supported way to play a track from a video and
 * still get play/pause control over it.
 *
 * The player is created as soon as the screen mounts, deliberately, even
 * though nothing plays until she taps. iPadOS only honours playVideo() when it
 * happens inside a real user gesture — if we waited until the tap to *also*
 * fetch the API and build the player, the call would land a second later,
 * outside the gesture, and iOS would silently refuse to start.
 * ------------------------------------------------------------------------- */

const VIDEO_ID = 'VB9101LT-6E'
const WATCH_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`

let apiPromise = null

/** Load YouTube's IFrame API once, no matter how many callers ask for it. */
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => reject(new Error('YouTube is unreachable'))
    document.head.appendChild(script)
  })
  return apiPromise
}

export default function MusicPlayer({ className = '' }) {
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [needsNudge, setNeedsNudge] = useState(false)

  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const nudgeTimer = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !hostRef.current) return

        playerRef.current = new YT.Player(hostRef.current, {
          videoId: VIDEO_ID,
          width: 200,
          height: 150,
          playerVars: {
            playsinline: 1, // never hijack the iPad into fullscreen
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            loop: 1,
            playlist: VIDEO_ID, // loop=1 is ignored without this on a single video
          },
          events: {
            onReady: () => !cancelled && setReady(true),
            onStateChange: (event) => {
              if (cancelled) return
              const state = window.YT.PlayerState

              if (event.data === state.ENDED) {
                // Belt and braces: loop=1 usually handles this, but a single
                // video occasionally ends anyway. Send it back to the start.
                event.target.seekTo(0)
                event.target.playVideo()
                return
              }

              // Mirror the player rather than assuming the tap worked. If a
              // browser refuses to start unmuted audio it drops straight back
              // to CUED/UNSTARTED, and a button still reading "Pause" over
              // silence is worse than one that admits nothing happened.
              const isOn = event.data === state.PLAYING || event.data === state.BUFFERING
              setPlaying(isOn)
              if (isOn) setNeedsNudge(false)
            },
            onError: () => !cancelled && setBlocked(true),
          },
        })
      })
      .catch(() => !cancelled && setBlocked(true))

    return () => {
      cancelled = true
      try {
        playerRef.current?.destroy()
      } catch {
        /* already gone */
      }
      playerRef.current = null
    }
  }, [])

  const toggle = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    if (nudgeTimer.current) clearTimeout(nudgeTimer.current)

    try {
      if (playing) {
        player.pauseVideo()
        setNeedsNudge(false)
        return
      }

      player.playVideo()
      // Some browsers only allow unmuted audio on a second, more deliberate
      // tap. If we are still not playing shortly after, say so instead of
      // leaving her tapping a button that looks like it did nothing.
      nudgeTimer.current = setTimeout(() => {
        const state = playerRef.current?.getPlayerState?.()
        const YTState = window.YT?.PlayerState
        if (YTState && state !== YTState.PLAYING && state !== YTState.BUFFERING) {
          setNeedsNudge(true)
        }
      }, 1600)
    } catch {
      setBlocked(true)
    }
  }, [playing])

  useEffect(() => () => nudgeTimer.current && clearTimeout(nudgeTimer.current), [])

  // If YouTube cannot load at all (offline, or blocked on the network she is
  // on), offer the honest fallback rather than a button that does nothing.
  if (blocked) {
    return (
      <a
        href={WATCH_URL}
        target="_blank"
        rel="noreferrer"
        className={[
          'inline-flex min-h-[48px] items-center gap-2 rounded-doodle border-[2.5px] border-dashed border-ink/40',
          'bg-paper px-4 py-2 font-hand text-2xl text-ink-soft shadow-sketch press-soft hover:text-ink',
          className,
        ].join(' ')}
      >
        🎵 our song ↗
      </a>
    )
  }

  return (
    <div className={['flex flex-col items-end gap-1', className].join(' ')}>
      <button
        type="button"
        onClick={toggle}
        disabled={!ready}
        aria-pressed={playing}
        className={[
          'inline-flex min-h-[48px] items-center gap-2 rounded-doodle border-[2.5px] px-4 py-2',
          'font-hand text-2xl font-semibold leading-none shadow-sketch press-soft',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
          'disabled:cursor-wait disabled:opacity-60',
          playing
            ? 'border-sage-deep bg-sage-soft text-ink'
            : 'border-blush-deep bg-blush-soft text-ink hover:bg-blush',
        ].join(' ')}
      >
        {playing ? (
          <>
            <EqualizerIcon /> Pause
          </>
        ) : (
          <>Play Music 🎵</>
        )}
      </button>

      {playing && (
        <p className="animate-fade-up text-right font-hand text-lg leading-tight text-ink-faint">
          our first dance —
          <br />
          It’s You, Henry Lau
        </p>
      )}

      {!playing && needsNudge && (
        <p className="max-w-[11rem] animate-fade-up text-right font-hand text-lg leading-tight text-blush-deep">
          tap once more to start it 🎧
        </p>
      )}

      {/* The real player. It needs genuine dimensions to behave, so it is given
          200x150 and then clipped to a single pixel by this wrapper — hiding it
          with display:none stops playback outright on iOS. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 right-0 h-px w-px overflow-hidden"
      >
        <div ref={hostRef} />
      </div>
    </div>
  )
}

/** Three little bars bouncing, so "playing" reads at a glance. */
function EqualizerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" role="img" aria-label="now playing">
      <g stroke="#3C3A38" strokeWidth="3" strokeLinecap="round">
        <path d="M5 15 V9">
          <animate attributeName="d" values="M5 15 V9; M5 19 V5; M5 15 V9" dur="1.1s" repeatCount="indefinite" />
        </path>
        <path d="M12 18 V6">
          <animate attributeName="d" values="M12 18 V6; M12 13 V11; M12 18 V6" dur="0.9s" repeatCount="indefinite" />
        </path>
        <path d="M19 16 V8">
          <animate attributeName="d" values="M19 16 V8; M19 20 V4; M19 16 V8" dur="1.3s" repeatCount="indefinite" />
        </path>
      </g>
    </svg>
  )
}
