import * as React from "react"

import { cn } from "../util/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

/** Mark the text an `OverflowTooltip` watches: it opens when this is cut off. */
export const OVERFLOW_TEXT = { "data-overflow-text": "" } as const

const isCutOff = (el: Element) =>
  el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1

const hasOverflow = (root: Element | null) => {
  if (!root) return false
  if (root.matches("[data-overflow-text]") && isCutOff(root)) return true
  return Array.from(root.querySelectorAll("[data-overflow-text]")).some(isCutOff)
}

/**
 * A tooltip for text that may not fit: it opens only when an element marked
 * with `OVERFLOW_TEXT` inside the trigger is cut off, or always when `always`
 * (say, a description the trigger has no room for). The trigger is the child.
 */
function OverflowTooltip({
  content,
  always = false,
  side,
  className,
  children,
}: {
  content: React.ReactNode
  always?: boolean
  side?: React.ComponentProps<typeof TooltipContent>["side"]
  className?: string
  children: React.ReactElement
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [open, setOpen] = React.useState(false)

  const onOpenChange = React.useCallback(
    (next: boolean) => setOpen(next && (always || hasOverflow(triggerRef.current))),
    [always]
  )

  return (
    <Tooltip open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger asChild ref={triggerRef}>
        {children}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={cn("whitespace-normal break-words", className)}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

export { OverflowTooltip }
