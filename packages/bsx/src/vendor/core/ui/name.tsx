import * as React from "react"

import { cn } from "../util/utils"

/** `.tiff`, `.ome.tiff`, `.tar.gz`: up to two short alphanumeric suffixes. */
const EXTENSION = /(?:\.[A-Za-z0-9]{1,5}){1,2}$/

/**
 * Where a long name is cut so both ends stay readable: the tail is the last
 * `keep` characters before the extension plus the extension, the head is the
 * rest. A name too short to be worth cutting comes back whole, as the head.
 */
export const splitName = (name: string, keep = 8): { head: string; tail: string } => {
  const match = EXTENSION.exec(name)
  // A dotfile (`.gitignore`) is all name, no extension.
  const extension = match && match.index > 0 ? match[0] : ""
  // By code point, so a surrogate pair is never cut in half.
  const stem = Array.from(name.slice(0, name.length - extension.length))
  if (keep <= 0 || stem.length <= keep * 2) return { head: name, tail: "" }
  return {
    head: stem.slice(0, stem.length - keep).join(""),
    tail: stem.slice(stem.length - keep).join("") + extension,
  }
}

/**
 * A name that keeps its start AND its end when it does not fit: the head
 * gives way with an ellipsis, the tail (the last characters and the
 * extension) never shrinks. Plain CSS, nothing is measured. When the name
 * fits it reads as ordinary text; copying copies it whole.
 *
 * The head carries `data-overflow-text`, so inside an `OverflowTooltip` the
 * tooltip opens exactly when the name is cut; elsewhere pass `title`.
 * Like `truncate`, it needs `min-w-0` on every flex ancestor up to the one
 * with a real width.
 */
function Name({
  children,
  keep,
  inline = false,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  children: string
  /** Characters kept before the extension (default 8). */
  keep?: number
  /** Sit in a line of text instead of filling the row. */
  inline?: boolean
}) {
  const { head, tail } = splitName(children, keep)
  return (
    <span
      data-slot="name"
      className={cn(
        inline ? "inline-flex align-bottom" : "flex",
        "min-w-0 max-w-full overflow-hidden",
        className
      )}
      {...props}
    >
      <span data-overflow-text="" className="min-w-0 truncate whitespace-pre">
        {head}
      </span>
      {tail && <span className="shrink-0 whitespace-pre">{tail}</span>}
    </span>
  )
}

export { Name }
