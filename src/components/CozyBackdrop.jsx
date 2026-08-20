import React from 'react'

/**
 * The page behind the page: warm paper, a wash of pastel light, and a few
 * doodles drifting about. Purely decorative and fully non-interactive.
 */
export default function CozyBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      {/* soft pools of colour, like light through a curtain */}
      <div className="absolute -left-24 -top-28 h-[26rem] w-[26rem] rounded-full bg-blush-soft opacity-60 blur-3xl" />
      <div className="absolute -right-28 top-1/4 h-[24rem] w-[24rem] rounded-full bg-sky-soft opacity-60 blur-3xl" />
      <div className="absolute bottom-[-8rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-sage-soft opacity-50 blur-3xl" />
      <div className="absolute right-1/4 top-[-6rem] h-[18rem] w-[18rem] rounded-full bg-butter-soft opacity-50 blur-3xl" />

      {/* faint ruled-notebook lines */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, transparent 0 43px, rgba(60,58,56,0.055) 43px 44px)',
        }}
      />

      {/* margin rule, like a school exercise book */}
      <div className="absolute inset-y-0 left-10 w-px bg-blush opacity-40 sm:left-16" />

      {/* drifting doodles */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <g stroke="#3C3A38" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.16">
          <path d="M96 210 q22 -30 44 0 q22 30 44 0" />
          <path d="M1052 168 q18 -24 36 0 q18 24 36 0" />
          <path d="M150 742 c-26 -30 6 -60 30 -36 c24 -24 56 6 30 36 l-30 30 z" />
          <path d="M1010 690 c-22 -26 5 -51 25 -31 c20 -20 47 5 25 31 l-25 25 z" />
          <circle cx="880" cy="120" r="16" />
          <circle cx="300" cy="120" r="9" />
          <path d="M240 470 l10 24 l26 4 l-19 18 l5 26 l-22 -13 l-22 13 l5 -26 l-19 -18 l26 -4 z" />
          <path d="M960 460 l8 19 l21 3 l-15 15 l4 21 l-18 -11 l-18 11 l4 -21 l-15 -15 l21 -3 z" />
          <path d="M540 60 q40 20 80 0" />
          <path d="M620 850 q40 -22 80 0" />
        </g>
      </svg>
    </div>
  )
}
