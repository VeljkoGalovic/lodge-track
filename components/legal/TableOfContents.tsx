"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronRight, Menu, X } from "lucide-react"

export interface TocItem {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollHandlerRef = useRef<(() => void) | null>(null)

  const handleScroll = useCallback(() => {
    const headerOffset = 100
    const scrollPosition = window.scrollY + headerOffset

    // Find the last heading that's above the scroll position
    let newActiveId = ""
    for (const item of items) {
      const element = document.getElementById(item.id)
      if (element && element.offsetTop <= scrollPosition) {
        newActiveId = item.id
      }
    }
    setActiveId(newActiveId)
  }, [items])

  useEffect(() => {
    // Initial check
    handleScroll()

    // Set up scroll listener with passive option for performance
    scrollHandlerRef.current = () => {
      requestAnimationFrame(handleScroll)
    }
    window.addEventListener("scroll", scrollHandlerRef.current, { passive: true })

    // Set up IntersectionObserver for more precise tracking
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {
        rootMargin: "-100px 0px -80% 0px",
        threshold: 0,
      }
    )

    items.forEach((item) => {
      const element = document.getElementById(item.id)
      if (element && observerRef.current) {
        observerRef.current.observe(element)
      }
    })

    return () => {
      if (scrollHandlerRef.current) {
        window.removeEventListener("scroll", scrollHandlerRef.current)
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [items, handleScroll])

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
      setActiveId(id)
      setIsOpen(false)
    }
  }, [])

  // Filter to only h2 and h3 headings
  const visibleItems = items.filter((item) => item.level === 2 || item.level === 3)

  // Deduplicate items by ID (keeping first occurrence)
  const seenIds = new Set<string>()
  const deduplicatedItems = visibleItems.filter((item) => {
    if (seenIds.has(item.id)) {
      return false
    }
    seenIds.add(item.id)
    return true
  })

  if (deduplicatedItems.length === 0) {
    return null
  }

  return (
    <>
      {/* Mobile TOC toggle button */}
      <button
        className="lg:hidden fixed bottom-6 right-6 z-50 glass-card p-3 rounded-xl border border-white/10 shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close table of contents" : "Open table of contents"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:block lg:col-span-1 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6 min-w-[280px] w-full"
        aria-label="Table of contents"
      >
        <nav className="glass-card p-4 rounded-2xl border border-white/10 w-full min-w-0">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            On this page
          </h2>
          <ul className="space-y-1" role="list" aria-label="Page sections">
            {deduplicatedItems.map((item, index) => (
              <li
                key={item.id}
                className={`transition-all duration-200 ${
                  item.level === 3 ? "pl-4" : ""
                }`}
              >
                <button
                  onClick={() => scrollToHeading(item.id)}
                  className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    activeId === item.id
                      ? "text-primary font-medium bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  aria-current={activeId === item.id ? "location" : undefined}
                >
                  {item.level === 3 && (
                    <ChevronRight
                      className="w-3 h-3 flex-shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  <span className="whitespace-normal break-words leading-relaxed">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      >
        <div className="absolute right-0 top-0 h-full w-full max-w-[320px] bg-background shadow-2xl border-l border-border overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              On this page
            </h2>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="p-1 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Close table of contents"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav>
            <ul className="space-y-1" role="list" aria-label="Page sections">
              {deduplicatedItems.map((item) => (
                <li
                  key={item.id}
                  className={`transition-all duration-200 ${
                    item.level === 3 ? "pl-4" : ""
                  }`}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      scrollToHeading(item.id)
                    }}
                    className={`w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                      activeId === item.id
                        ? "text-primary font-medium bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                    aria-current={activeId === item.id ? "location" : undefined}
                  >
                    {item.level === 3 && (
                      <ChevronRight
                        className="w-3 h-3 flex-shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                    <span className="whitespace-normal break-words leading-relaxed">{item.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      </div>
    </>
  )
}