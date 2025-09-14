import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-[#f5f7fc] border border-[#e5e8f0] placeholder:text-[#bfc8dc] text-[#37445c] rounded-lg px-4 py-2 h-11 w-full text-base transition-all outline-none focus:border-[#ff1901] focus:ring-2 focus:ring-[#ff1901]/20 disabled:bg-[#f5f7fc] disabled:opacity-60 file:text-[#37445c] file:bg-transparent file:border-0 file:font-medium md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
