import React, { useEffect, useState } from 'react'

/* ---------------------------------------------------------------------------
 * Two clocks, one for each of us.
 *
 * Everything here goes through Intl with a named IANA zone rather than a fixed
 * UTC offset. Toronto changes offset twice a year and Tashkent never does, so
 * hard-coding -5 and +5 would quietly drift out by an hour every March.
 * ------------------------------------------------------------------------- */

const PLACES = [
  { who: 'Nodir', city: 'Toronto', zone: 'America/Toronto' },
  { who: 'Zukhra', city: 'Tashkent', zone: 'Asia/Tashkent' },
]

/** Minutes that `zone` sits ahead of UTC at this instant, DST included. */
function offsetMinutes(date, zone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  // Drop milliseconds off `date` so the two sides are comparable.
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

function readClock(date, zone) {
  // h23 keeps midnight as 00 rather than the 24 some locales produce.
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', hourCycle: 'h23' }).format(date),
  )
  return {
    hour,
    time: new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date),
    weekday: new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(date),
    // Sortable YYYY-MM-DD, so two zones' dates compare with a plain <.
    dayKey: new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
    daytime: hour >= 6 && hour < 18,
  }
}

export default function TimeTogether() {
  const [now, setNow] = useState(() => new Date())

  // Tick on the minute boundary rather than every second: the display only
  // shows minutes, so this is one render an hour times sixty instead of 3600.
  useEffect(() => {
    let timer
    const tick = () => {
      const current = new Date()
      setNow(current)
      const msToNextMinute = 60000 - (current.getSeconds() * 1000 + current.getMilliseconds())
      timer = setTimeout(tick, msToNextMinute + 50)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  const clocks = PLACES.map((place) => ({ ...place, ...readClock(now, place.zone) }))
  const [mine, hers] = clocks

  const gapHours = Math.round(
    (offsetMinutes(now, PLACES[1].zone) - offsetMinutes(now, PLACES[0].zone)) / 60,
  )
  const sheIsAhead = hers.dayKey > mine.dayKey

  return (
    <div className="mt-16 flex flex-col items-center">
      <p className="font-hand text-2xl text-ink-faint">right now, we are here</p>

      <div className="mt-3 flex flex-wrap items-stretch justify-center gap-4 sm:gap-6">
        {clocks.map((clock, i) => (
          <ClockCard key={clock.zone} clock={clock} alt={i % 2 === 1} />
        ))}
      </div>

      <p className="mt-4 max-w-xs text-center font-hand text-2xl text-blush-deep">
        {gapHours} hours apart
        {sheIsAhead ? ', and you are already in tomorrow ✨' : ', under the same sky 🤍'}
      </p>
    </div>
  )
}

function ClockCard({ clock, alt }) {
  const { who, city, time, weekday, daytime } = clock

  return (
    <div
      className={[
        'relative min-w-[9.5rem] border-[2.5px] border-ink/70 px-5 py-4 text-center shadow-sketch',
        alt ? 'rounded-doodle-alt' : 'rounded-doodle',
        daytime ? 'bg-butter-soft' : 'bg-lilac/40',
      ].join(' ')}
    >
      <div className="flex justify-center">{daytime ? <SunIcon /> : <MoonIcon />}</div>

      <p className="mt-1 font-hand text-3xl font-semibold leading-none text-ink">{who}</p>
      <p className="mt-1.5 font-hand text-4xl leading-none text-ink">{time}</p>
      <p className="mt-1.5 font-body text-xs uppercase tracking-wide text-ink-faint">{city}</p>
      <p className="font-hand text-lg leading-tight text-ink-faint">{weekday}</p>
    </div>
  )
}

/** A small hand-inked sun, matching the line weight of the rest of the app. */
function SunIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 animate-float-soft" role="img" aria-label="daytime">
      <g stroke="#3C3A38" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <circle cx="24" cy="24" r="9" fill="#F6E3A8" />
        <path d="M24 6 V2 M24 46 V42 M6 24 H2 M46 24 H42" />
        <path d="M11 11 L8 8 M37 37 L40 40 M37 11 L40 8 M11 37 L8 40" />
      </g>
    </svg>
  )
}

/** A crescent moon with two stars, for the one of us who should be asleep. */
function MoonIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 animate-float-soft" role="img" aria-label="night time">
      <g stroke="#3C3A38" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M30 8 a16 16 0 1 0 10 26 A13 13 0 0 1 30 8 z"
          fill="#D9CDE8"
        />
        <path d="M12 12 l1.6 3.6 l3.6 1.6 l-3.6 1.6 L12 22.4 l-1.6-3.6 L6.8 17.2 l3.6-1.6 z" fill="#F6E3A8" strokeWidth="2" />
        <path d="M39 40 l1.1 2.5 l2.5 1.1 l-2.5 1.1 L39 47.2 l-1.1-2.5 L35.4 43.6 l2.5-1.1 z" fill="#F6E3A8" strokeWidth="2" />
      </g>
    </svg>
  )
}
