import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
  "bg-[#f5f7fc] border border-[#e5e8f0] placeholder:text-[#bfc8dc] text-[#37445c] rounded-lg px-4 py-2 min-h-16 w-full text-base transition-all outline-none focus:border-[#37445c] focus:ring-2 focus:ring-[#37445c]/20 disabled:bg-[#f5f7fc] disabled:opacity-60 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
