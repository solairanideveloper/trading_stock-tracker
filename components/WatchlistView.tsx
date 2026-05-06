"use client";

import React, { useEffect, useState } from 'react';

interface Props {
  serverSymbols?: string[];
  isAuthenticated?: boolean;
}

const WatchlistView = ({ serverSymbols = [], isAuthenticated = false }: Props) => {
  const [symbols, setSymbols] = useState<string[]>(serverSymbols || []);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // If server provided symbols (authenticated user) use them
    if (serverSymbols && serverSymbols.length > 0) {
      setSymbols(serverSymbols.map((s) => s.toUpperCase()));
      return;
    }

    // For unauthenticated users, read localStorage fallback
    try {
      const key = 'signalist:watchlist';
      const raw = localStorage.getItem(key);
      if (!raw) {
        setSymbols([]);
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) {
        setSymbols(parsed.map((s) => String(s).toUpperCase()));
      } else {
        setSymbols([]);
      }
    } catch (e) {
      console.error('Failed to read local watchlist:', e);
      setSymbols([]);
    }
  }, [serverSymbols]);

  const clearLocal = () => {
    try {
      localStorage.removeItem('signalist:watchlist');
      setSymbols([]);
    } catch (e) {
      console.error('Failed to clear local watchlist:', e);
    }
  };

  const refreshServer = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      if (data?.success && Array.isArray(data.symbols)) {
        setSymbols(data.symbols.map((s: string) => String(s).toUpperCase()));
      }
    } catch (e) {
      console.error('Failed to refresh watchlist:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div>
      {symbols.length === 0 ? (
        <div className="watchlist-empty-container">
          <p className="watchlist-empty">Your watchlist is empty.</p>
          {!isAuthenticated && (
            <p className="watchlist-empty">Sign in to persist a watchlist across devices.</p>
          )}
        </div>
      ) : (
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Symbol</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map((sym) => (
              <tr key={sym}>
                <td>
                  <a href={`/stocks/${encodeURIComponent(sym)}`} className="watchlist-link">
                    {sym}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex gap-4">
        {isAuthenticated ? (
          <>
            <button className="btn btn-primary" onClick={refreshServer}>Refresh</button>
          </>
        ) : (
          symbols.length > 0 && (
            <button className="btn btn-secondary" onClick={clearLocal}>Clear local watchlist</button>
          )
        )}
      </div>
    </div>
  );
};

export default WatchlistView;
