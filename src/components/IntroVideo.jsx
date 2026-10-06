import React, { useCallback, useEffect, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'
import { asset } from '../utils/assets'

/* ---------------------------------------------------------------------------
 * The welcome video, shown every time the site is opened (after the password).
 *
 * Browsers only allow autoplay when a video is muted, so it always starts
 * silent and offers a "tap for sound" chip instead of blasting audio at
 * someone who has just opened a link. Two rules keep it from ever getting in
 * the way: the skip button is always there, and if the file is missing or
 * unplayable the intro quietly steps aside rather than blocking the app.
 *
 * To change the video, replace public/generated_video.mp4 (and the still it
 * shows while loading, public/intro-poster.jpg).
 * ------------------------------------------------------------------------- */

const VIDEO_SRC = asset('generated_video.mp4')
const POSTER_SRC = asset('intro-poster.jpg')

/** Only claims silence when the browser can prove it; unknown counts as "has sound". */
function knownSilent(video) {
  if (typeof video.mozHasAudio === 'boolean') return !video.mozHasAudio
  if (video.audioTracks && typeof video.audioTracks.length === 'number') {
    return video.audioTracks.length === 0
  }
  return false
}

export default function IntroVideo({ onEnter, name = 'Zukhra' }) {
  const videoRef = useRef(null)
  const [reduceMotion] = useState(
    () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )

  const [ratio, setRatio] = useState(16 / 9)
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  // True when the browser refused to autoplay, or when someone has asked for
  // less motion: either way she gets a play button rather than a moving picture.
  const [blocked, setBlocked] = useState(reduceMotion)
  const [muted, setMuted] = useState(true)
  const [hasSound, setHasSound] = useState(true)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    if (!reduceMotion) {
      // defaultMuted writes the real `muted` attribute, which iOS Safari looks
      // for before it will agree to autoplay.
      video.defaultMuted = true
      video.muted = true
      video.play()?.catch((err) => {
        if (err?.name === 'NotAllowedError') setBlocked(true)
      })
    }
    return () => video.pause()
  }, [reduceMotion])

  // Only worth announcing "warming up" if the first frame is genuinely slow.
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 900)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!failed) return
    console.warn(`[IntroVideo] could not play ${VIDEO_SRC}, so the intro was skipped.`)
    onEnter()
  }, [failed, onEnter])

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onEnter()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onEnter])

  const play = useCallback(
    ({ withSound = false } = {}) => {
      const video = videoRef.current
      if (!video) return
      if (ended || video.ended) {
        video.currentTime = 0
        setProgress(0)
        setEnded(false)
      }
      if (withSound) {
        video.muted = false
        setMuted(false)
      }
      video.play().catch(() => setBlocked(true))
    },
    [ended],
  )

  // Pressing play after a refused autoplay is a deliberate act, so the sound
  // comes with it; tapping a video that is already playing just pauses it.
  const togglePlay = useCallback(() => {
    if (playing) videoRef.current?.pause()
    else play({ withSound: blocked })
  }, [playing, blocked, play])

  const toggleSound = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }, [])

  const showPlay = blocked || (ready && !playing && !ended)

  return (
    <section
      aria-label="A little welcome video"
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col items-center justify-center px-5 py-8 short:py-3"
    >
      <p className="animate-fade-up text-balance text-center font-hand text-3xl text-ink-soft sm:text-4xl short:hidden">
        someone has a message <span className="whitespace-nowrap">for you 🥜</span>
      </p>

      {/* The dvh term keeps a tall video from outgrowing the screen, and the
          tighter one takes over on a phone held sideways. */}
      <div
        className="mt-6 w-full max-w-[min(100%,44rem,calc(var(--ratio)*58dvh))] animate-pop-in short:mt-0 short:max-w-[min(100%,44rem,calc(var(--ratio)*48dvh))]"
        style={{ '--ratio': ratio, animationDelay: '120ms' }}
      >
        <div className="relative -rotate-[1.2deg] rounded-card border-[3px] border-ink/75 bg-paper p-2.5 shadow-sketch-lg sm:p-3.5">
          <span className="washi -top-3 left-8 -rotate-6 bg-blush" />
          <span className="washi -top-3 right-8 rotate-6 bg-butter" />

          <div
            className="relative overflow-hidden rounded-pebble border-2 border-ink/50 bg-paper-deep"
            style={{ aspectRatio: ratio }}
          >
            <video
              ref={videoRef}
              src={VIDEO_SRC}
              poster={POSTER_SRC}
              autoPlay={!reduceMotion}
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload noremoteplayback"
              className="absolute inset-0 h-full w-full object-cover"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget
                if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight)
                setHasSound(!knownSilent(v))
              }}
              onLoadedData={() => setReady(true)}
              onPlaying={() => {
                setReady(true)
                setPlaying(true)
                setBlocked(false)
                setEnded(false)
              }}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false)
                setEnded(true)
                setProgress(1)
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget
                if (v.duration) setProgress(v.currentTime / v.duration)
              }}
              onError={() => setFailed(true)}
            />

            <button
              type="button"
              onClick={togglePlay}
              aria-label={ended ? 'Watch the video again' : playing ? 'Pause the video' : 'Play the video'}
              className="absolute inset-0 z-[1] cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-butter"
            />

            {/* Corner chips rather than a big centred button: the character
                stands dead centre, and the still he walks in from the left. */}
            {showPlay && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-3.5 left-2.5 z-[2] flex min-h-[44px] animate-float-soft items-center gap-2 rounded-doodle border-[2.5px] border-blush-deep bg-blush-soft px-3.5 py-2 font-hand text-xl font-semibold leading-none text-ink shadow-sketch sm:text-2xl"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M7.5 4.8 L19.2 12 L7.5 19.2 Z"
                    fill="#E39BA6"
                    stroke="#3C3A38"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                {blocked ? 'tap to play' : 'resume'}
              </span>
            )}

            {!ready && slow && !blocked && (
              <span className="pointer-events-none absolute left-1/2 top-3 z-[2] -translate-x-1/2 animate-pulse whitespace-nowrap rounded-pebble border-2 border-ink/30 bg-paper/90 px-3 py-1 font-hand text-xl text-ink-soft">
                warming up the projector…
              </span>
            )}

            {hasSound && !blocked && (
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={!muted}
                className={[
                  'absolute bottom-3.5 right-2.5 z-[3] flex min-h-[44px] items-center rounded-pebble border-2 px-2.5 py-1.5 sm:px-3',
                  'font-hand text-lg leading-none shadow-sketch press-soft sm:text-xl',
                  'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter',
                  muted
                    ? 'animate-float-soft border-ink/70 bg-butter-soft text-ink'
                    : 'border-ink/40 bg-paper/90 text-ink-soft',
                ].join(' ')}
              >
                {muted ? '🔇 tap for sound' : '🔊 sound on'}
              </button>
            )}

            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[3] h-1.5 bg-ink/15">
              <div
                className="h-full bg-blush-deep transition-[width] duration-300 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>

          <p className="mt-2 pb-1 text-center font-hand text-3xl leading-tight text-ink sm:text-4xl">
            for you, {name} ❤️
          </p>
        </div>
      </div>

      {/* Fixed height, so the picture never jumps when the buttons change. */}
      <div className="mt-6 flex min-h-[8.5rem] flex-col items-center gap-3 short:mt-3 short:min-h-[4.5rem] short:flex-row short:justify-center">
        {ended ? (
          <>
            <DoodleButton size="lg" variant="blush" className="animate-pop-in" onClick={onEnter} autoFocus>
              Come on in ✨
            </DoodleButton>
            <DoodleButton size="sm" variant="ghost" alt onClick={() => play()}>
              ↺ watch again
            </DoodleButton>
          </>
        ) : (
          <DoodleButton size="sm" variant="ghost" onClick={onEnter}>
            skip →
          </DoodleButton>
        )}
      </div>
    </section>
  )
}
