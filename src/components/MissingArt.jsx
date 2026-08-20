import React from 'react'

/**
 * Stands in the exact spot a picture should have been.
 *
 * Deliberately plain and a little apologetic: this is the only thing in the
 * app that is allowed to look unfinished, because it means a file did not
 * load and someone needs to go and put it there. It names the file so the fix
 * is obvious without opening the console.
 */
export default function MissingArt({ file, what = 'picture', className = '' }) {
  return (
    <div
      className={[
        'flex h-full w-full flex-col items-center justify-center gap-2',
        'border-[2.5px] border-dashed border-ink-faint/60 bg-paper-deep p-5 text-center',
        className,
      ].join(' ')}
    >
      <span className="text-4xl opacity-60" aria-hidden="true">
        🖼️
      </span>
      <p className="font-hand text-2xl leading-tight text-ink-soft">
        this {what} is not here yet
      </p>
      {file && (
        <code className="max-w-full break-all rounded bg-paper px-2 py-1 font-mono text-[11px] text-ink-faint">
          {file}
        </code>
      )}
    </div>
  )
}
