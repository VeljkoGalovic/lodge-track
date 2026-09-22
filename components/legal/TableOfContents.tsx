"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

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
    }
  }, [])

  // Filter to only h2 and h3 headings
  const visibleItems = items.filter((item) => item.level === 2 || item.level === 3)

  if (visibleItems.length === 0) {
    return null
  }

  return (
    <aside
      className="hidden lg:block lg:col-span-1 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6"
      aria-label="Table of contents"
    >
      <nav className="glass-card p-4 rounded-2xl border border-white/10">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
          On this page
        </h2>
        <ul className="space-y-1.5" role="list" aria-label="Page sections">
          {visibleItems.map((item, index) => (
            <li
              key={item.id}
              className={`transition-all duration-200 ${
                item.level === 3 ? "pl-4" : ""
              }`}
            >
              <button
                onClick={() => scrollToHeading(item.id)}
                className={`w-full text-left text-sm py-1.5 px-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
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
                <span className="truncate">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}