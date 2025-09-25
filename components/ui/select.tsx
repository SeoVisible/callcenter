"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // Use white background for trigger to match dropdown and improve contrast
        "bg-white border border-[#e5e8f0] data-[placeholder]:text-[#bfc8dc] text-[#37445c] rounded-lg px-4 py-2 flex w-full items-center justify-between gap-2 text-base transition-all outline-none focus:border-[#37445c] focus:ring-2 focus:ring-[#37445c]/20 disabled:bg-[#f5f7fc] disabled:opacity-60 data-[size=default]:h-11 data-[size=sm]:h-10 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Focus the input when the content mounts (dropdown opened) and clear when it unmounts (dropdown closed)
  React.useEffect(() => {
    // Keep trying to focus the search input while the dropdown is open. Radix
    // may move focus for accessibility; repeated attempts plus preventScroll
    // make the input reliably receive keyboard events. We also clear the
    // query when the dropdown closes.
    let mounted = true

    const tryFocus = () => {
      try {
        if (!mounted) return
        inputRef.current?.focus({ preventScroll: true })
      } catch {}
    }

    // initial attempts around animation frames and a short interval while open
    requestAnimationFrame(() => tryFocus())
    const t1 = setTimeout(tryFocus, 0)
    const t2 = setTimeout(tryFocus, 50)
    const t3 = setTimeout(tryFocus, 200)

    // Maintain focus for a short period in case Radix shifts it during mount.
    const interval = setInterval(tryFocus, 300)

    return () => {
      mounted = false
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearInterval(interval)
      setQuery("")
    }
  }, [])

  // Helper: recursively extract text from React nodes
  const nodeToString = (node: React.ReactNode): string => {
    if (node == null) return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(nodeToString).join("")
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode }
      return nodeToString(props.children ?? "")
    }
    return ""
  }

  // Filter SelectItem children by query. We identify items by the data-slot attribute added in SelectItem
  // and match both the explicit value prop (e.g., id) and the visible label text.
  const filteredChildren = React.Children.toArray(children).filter((child) => {
    if (!React.isValidElement(child)) return true
    const el = child as React.ReactElement

    // Try to read value and children from the element's props. Use a
    // generic props shape to avoid `any` while still being flexible.
    const props = el.props as Record<string, unknown>
    const valueProp = props["value"] as string | number | undefined
    const content = props["children"] as React.ReactNode | undefined
    const labelText = nodeToString(content)
    const combined = `${valueProp ?? ""} ${labelText}`.toLowerCase()

    // If there is no meaningful text (e.g., separators), keep the element so UI isn't broken.
    if (!combined.trim()) return true

    return combined.includes(query.toLowerCase())
  })

  // Debugging: report how many items match the query
  React.useEffect(() => {
    try {
      const total = React.Children.toArray(children).length
      console.debug(`SelectContent: query="${query}", totalItems=${total}, filtered=${filteredChildren.length}`)
    } catch {
      // ignore
    }
  }, [query, children, filteredChildren.length])

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          // Force a white dropdown background across the site and keep existing animations/shadow
          "bg-white text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
        
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
          )}
        >
          {/* Search input to filter SelectItem entries */}
          <div className="px-2 pb-2">
            <input
              data-slot="select-search"
              ref={inputRef}
              aria-label="Search options"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className={cn(
                "w-full border rounded-md px-3 py-2 text-sm bg-white text-[#37445c] placeholder:text-[#bfc8dc] outline-none focus:ring-2 focus:ring-[#37445c]/20"
              )}
            />
          </div>

          {/* Render filtered children so search works across the dropdown */}
          {filteredChildren}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      onPointerDown={(e) => {
        // Prevent the item from taking focus away from the search input when
        // clicked so the user can continue typing or the input retains focus
        // reliably. The selection still occurs.
        try {
          e.preventDefault()
        } catch {}
      }}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
