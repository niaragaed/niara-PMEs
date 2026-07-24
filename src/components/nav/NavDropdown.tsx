"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { NavItem } from "@/lib/nav-items";

// Painel flutuante do dropdown (desktop). Abre no hover e no foco/clique;
// fecha com Escape, clique fora, ou quando o foco sai do componente. O
// fechamento por hover tem um pequeno atraso para o mouse poder cruzar o
// vão entre o botão e o painel sem o menu sumir no meio do caminho.
export function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const closeNow = useCallback(() => {
    clearCloseTimer();
    setOpen(false);
  }, [clearCloseTimer]);

  const closeWithDelay = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNow();
    }
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeNow();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closeNow]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  if (!item.children) return null;

  return (
    <div ref={containerRef} className="relative" onMouseEnter={openNow} onMouseLeave={closeWithDelay}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? closeNow() : openNow())}
        onFocus={openNow}
        className="flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        {item.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={item.label}
          onFocus={openNow}
          onBlur={(event) => {
            if (!containerRef.current?.contains(event.relatedTarget as Node)) {
              closeNow();
            }
          }}
          className="absolute left-1/2 top-full z-40 mt-3 w-[460px] -translate-x-1/2 animate-dropdown rounded-lg border border-border bg-surface p-2 shadow-soft-lg"
        >
          <ul className="grid grid-cols-2 gap-1">
            {item.children.map((child) => {
              const Icon = child.icon;
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    role="menuitem"
                    onClick={closeNow}
                    className="group flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-alt text-ink-muted transition-colors group-hover:text-military">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">{child.label}</span>
                      <span className="mt-0.5 block text-xs text-ink-muted">{child.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
