"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

/**
 * tabsListVariants
 *
 * default — dark pill container (var(--bg-elevated)) suited for embedded
 *           panels where tabs sit within a surface.
 *
 * line    — transparent list with a hairline bottom border. Active tabs
 *           show a 2px accent-primary underline that bleeds over the
 *           container border via negative margin, matching the control-room
 *           header tab pattern.
 */
const tabsListVariants = cva(
  [
    // Core layout — inline-flex, scrollable overflow for many tabs
    "group/tabs-list inline-flex items-center justify-start rounded-lg gap-0.5",
    // Horizontal: fixed height; vertical: auto height, column direction
    "group-data-horizontal/tabs:h-9",
    "group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
    // Padding inside the pill container (overridden by 'line' variant)
    "p-1",
  ].join(" "),
  {
    variants: {
      variant: {
        /*
         * Filled pill — dark elevated surface with a subtle border.
         * Uses the project's design-system CSS custom properties so it
         * inherits emergency-mode overrides automatically.
         */
        default: [
          "bg-[var(--bg-elevated)]",
          "border border-[var(--border-subtle)]",
        ].join(" "),

        /*
         * Line — transparent background, bottom border only.
         * Tab triggers overlap the border with a 2px accent underline.
         * The padding-bottom is removed so the trigger underline sits
         * flush with the list border.
         */
        line: [
          "bg-transparent rounded-none gap-1",
          "border-b border-[var(--border-default)]",
          "pb-0 p-0",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // ── Layout ───────────────────────────────────────────────────────
        "relative inline-flex h-7 flex-1 items-center justify-center gap-1.5 whitespace-nowrap",

        // ── Shape & padding ───────────────────────────────────────────────
        // Rounded inside the pill container. Vertical tabs get full width.
        "rounded-md px-3 py-1.5",
        "group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-2",

        // ── Typography ────────────────────────────────────────────────────
        // text-xs + tracking-wide matches the control-room mono label style.
        "text-xs font-medium tracking-wide",

        // ── Idle state ────────────────────────────────────────────────────
        "text-[var(--text-secondary)] transition-all duration-150",

        // ── Hover ─────────────────────────────────────────────────────────
        "hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]",

        // ── Active / selected (default variant) ───────────────────────────
        // bg-interactive is one step lighter than bg-elevated, creating clear
        // depth separation. Accent-primary text signals the selected tab.
        "data-[state=active]:bg-[var(--bg-interactive)]",
        "data-[state=active]:text-[var(--accent-primary)]",
        "data-[state=active]:shadow-sm",

        // ── Disabled ──────────────────────────────────────────────────────
        "disabled:pointer-events-none disabled:opacity-40",

        // ── Focus ring ────────────────────────────────────────────────────
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-1",
        "focus-visible:ring-offset-[var(--bg-elevated)]",

        // ── Icon sizing ───────────────────────────────────────────────────
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",

        // ── Line variant overrides ─────────────────────────────────────────
        // Transparent background; active state shows a 2px bottom border
        // in accent-primary that overlaps the list's hairline border.
        "group-data-[variant=line]/tabs-list:rounded-none",
        "group-data-[variant=line]/tabs-list:bg-transparent",
        "group-data-[variant=line]/tabs-list:hover:bg-transparent",
        "group-data-[variant=line]/tabs-list:border-b-2",
        "group-data-[variant=line]/tabs-list:border-transparent",
        // The -1px bottom margin lets the 2px trigger border overlap the
        // 1px list border, so the two merge into a single visible line.
        "group-data-[variant=line]/tabs-list:mb-[-1px]",
        "group-data-[variant=line]/tabs-list:pb-2",
        // Active overrides for line variant
        "group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none",
        "group-data-[variant=line]/tabs-list:data-[state=active]:border-[var(--accent-primary)]",

        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm/relaxed outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }