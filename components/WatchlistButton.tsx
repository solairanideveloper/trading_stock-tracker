"use client";
import React, { useMemo, useState, useEffect } from "react";

// Minimal WatchlistButton implementation to satisfy page requirements.
// This component focuses on UI contract only. It toggles local state and
// calls onWatchlistChange if provided. Styling hooks match globals.css.

const WatchlistButton = ({
  symbol,
  company,
  isInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) => {
  const [added, setAdded] = useState<boolean>(!!isInWatchlist);

  useEffect(() => {
    // For unauthenticated users, keep a local watchlist fallback in localStorage
    try {
      const raw = localStorage.getItem('signalist:watchlist');
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.includes(symbol)) {
        setAdded(true);
      }
    } catch (e) {
      // ignore
    }
  }, [symbol]);

  const label = useMemo(() => {
    if (type === "icon") return added ? "" : "";
    return added ? "Remove from Watchlist" : "Add to Watchlist";
  }, [added, type]);

  const handleClick = async () => {
    const next = !added;
    // Optimistic UI update
    setAdded(next);
    onWatchlistChange?.(symbol, next);

    // Try server API first; if it fails (not authenticated or network error), fall back to localStorage
    try {
      const res = await fetch('/api/watchlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, company }),
      });

      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }

      // Success — nothing else to do
    } catch (err) {
      // Fallback: store watchlist locally so unauthenticated users still see the change
      try {
        const key = 'signalist:watchlist';
        const raw = localStorage.getItem(key);
        let list: string[] = raw ? JSON.parse(raw) : [];
        if (next) {
          if (!list.includes(symbol)) list.push(symbol);
        } else {
          list = list.filter((s) => s !== symbol);
        }
        localStorage.setItem(key, JSON.stringify(list));
      } catch (e) {
        console.error('Failed to persist watchlist locally:', e);
      }
    }
  };

  if (type === "icon") {
    return (
      <button
        title={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        aria-label={added ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        className={`watchlist-icon-btn ${added ? "watchlist-icon-added" : ""}`}
        onClick={handleClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={added ? "#FACC15" : "none"}
          stroke="#FACC15"
          strokeWidth="1.5"
          className="watchlist-star"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
          />
        </svg>
      </button>
    );
  }

  return (
    <button className={`watchlist-btn ${added ? "watchlist-remove" : ""}`} onClick={handleClick}>
      {showTrashIcon && added ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5 mr-2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m4-6v6" />
        </svg>
      ) : null}
      <span>{label}</span>
    </button>
  );
};

export default WatchlistButton;
