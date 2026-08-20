import React from 'react'

const VARIANTS = {
  blush: 'bg-blush-soft border-blush-deep text-ink hover:bg-blush',
  sage: 'bg-sage-soft border-sage-deep text-ink hover:bg-sage',
  butter: 'bg-butter-soft border-butter-deep text-ink hover:bg-butter',
  sky: 'bg-sky-soft border-sky-deep text-ink hover:bg-sky',
  ghost: 'bg-paper border-ink-faint text-ink-soft hover:bg-paper-deep hover:text-ink',
}

const SIZES = {
  sm: 'px-4 py-2 text-lg',
  md: 'px-6 py-3 text-2xl',
  lg: 'px-9 py-4 text-3xl',
}

/**
 * The one button in the app. Lopsided corners and a hand-inked border do the
 * heavy lifting; `alt` flips the radius so two buttons side by side never look
 * like the same stamp used twice.
 *
 * Tap targets are generous by default — this is an iPad app first.
 */
export default function DoodleButton({
  children,
  variant = 'blush',
  size = 'md',
  alt = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={[
        'font-hand font-semibold leading-none',
        'border-[2.5px] shadow-sketch press-soft',
        'min-h-[52px] select-none',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-butter focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        alt ? 'rounded-doodle-alt' : 'rounded-doodle',
        VARIANTS[variant] || VARIANTS.blush,
        SIZES[size] || SIZES.md,
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </button>
  )
}
