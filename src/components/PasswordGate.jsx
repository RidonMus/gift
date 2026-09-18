import React, { useCallback, useRef, useState } from 'react'
import DoodleButton from './DoodleButton'

/* ---------------------------------------------------------------------------
 * A very basic front door.
 *
 * This is deliberately not real security — the code sits in plain text in the
 * bundle, same as everything else in a static site. It exists to keep the
 * link from being casually stumbled into, not to withstand anyone who opens
 * dev tools. Once entered correctly it is remembered on this device via
 * localStorage, so it only has to happen once per phone or iPad, not once per
 * visit.
 * ------------------------------------------------------------------------- */

const PASSWORD = '1125'

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  const tryUnlock = useCallback(() => {
    if (value.trim() === PASSWORD) {
      onUnlock()
      return
    }
    setShake(true)
    setValue('')
    inputRef.current?.focus()
    setTimeout(() => setShake(false), 500)
  }, [value, onUnlock])

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center px-5 py-10">
      <div
        className={[
          'paper-grain relative w-full max-w-sm rounded-card border-[2.5px] border-ink/70 bg-paper px-7 py-9 text-center shadow-sketch-lg',
          shake ? 'animate-wiggle' : 'animate-pop-in',
        ].join(' ')}
      >
        <span className="washi -top-3 left-1/2 -translate-x-1/2 -rotate-3 bg-blush" />

        <p className="text-4xl">🔒</p>
        <h1 className="mt-2 font-hand text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Just for us
        </h1>
        <p className="mt-2 font-body text-sm text-ink-soft">
          You know the little number. Type it in.
        </p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
          aria-label="Password"
          placeholder="••••"
          className="mt-5 w-full rounded-pebble border-2 border-ink/40 bg-paper-deep px-4 py-3 text-center font-hand text-3xl tracking-[0.4em] text-ink placeholder:tracking-normal placeholder:text-ink-faint/60 focus:border-ink/70 focus:outline-none"
        />

        <div className="mt-5">
          <DoodleButton variant="blush" onClick={tryUnlock} disabled={!value.trim()}>
            Unlock ✨
          </DoodleButton>
        </div>

        {shake && (
          <p className="mt-3 font-hand text-xl text-blush-deep">hmm, not quite — try again</p>
        )}
      </div>
    </div>
  )
}
