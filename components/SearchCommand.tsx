"use client"

import { useEffect, useState } from "react"
import { CommandDialog, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import {Button} from "@/components/ui/button";
import {Loader2,  TrendingUp} from "lucide-react";
import Link from "next/link";
import {searchStocks} from "@/lib/actions/finnhub.actions";
import {useDebounce} from "@/hooks/useDebounce";

export default function SearchCommand({ renderAs = 'button', label = 'Add stock', initialStocks }: SearchCommandProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);

  const isSearchMode = !!searchTerm.trim();
  const displayStocks = isSearchMode ? stocks : stocks?.slice(0, 10);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const FINNHUB_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '';

  const handleSearch = async () => {
    if(!isSearchMode) return setStocks(initialStocks);

    // If the public finnhub key is not set, avoid calling server and show empty results
    if (isSearchMode && !FINNHUB_KEY) {
      setStocks([]);
      return;
    }

    setLoading(true)
    try {
        const results = await searchStocks(searchTerm.trim());
        setStocks(results);
    } catch {
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchTerm]);

  const handleSelectStock = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks(initialStocks);
  }

  return (
    <>
      {renderAs === 'text' ? (
          <span onClick={() => setOpen(true)} className="search-text">
            {label}
          </span>
      ): (
          <Button onClick={() => setOpen(true)} className="search-btn">
            {label}
          </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog">
        <div className="search-field">
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search stocks..." className="search-input" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {loading ? (
              <CommandEmpty className="search-list-empty">Loading stocks...</CommandEmpty>
          ) : (isSearchMode && !FINNHUB_KEY) ? (
              <CommandEmpty className="search-list-empty">Search is not configured — missing FINNHUB API key.</CommandEmpty>
          ) : displayStocks?.length === 0 ? (
              <div className="search-list-indicator">
                {isSearchMode ? 'No results found' : 'No stocks available'}
              </div>
            ) : (
            <ul>
              <div className="search-count">
                {isSearchMode ? 'Search results' : 'Popular stocks'}
                {` `}({displayStocks?.length || 0})
              </div>
              {displayStocks?.map((stock, i) => (
                  <li key={stock.symbol} className="search-item">
                    <Link
                        href={`/stocks/${stock.symbol}`}
                        onClick={handleSelectStock}
                        className="search-item-link"
                    >
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <div  className="flex-1">
                        <div className="search-item-name">
                          {stock.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {stock.symbol} | {stock.exchange } | {stock.type}
                        </div>
                      </div>
                    </Link>
                    <button
                      className={`ml-3 text-sm rounded px-2 py-1 ${stock.isInWatchlist ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-800'}`}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Optimistic update
                        setStocks((prev) => prev.map((s) => (s.symbol === stock.symbol ? { ...s, isInWatchlist: !s.isInWatchlist } : s)));

                        try {
                          const res = await fetch('/api/watchlist', {
                            method: stock.isInWatchlist ? 'DELETE' : 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ symbol: stock.symbol, company: stock.name }),
                          });

                          if (!res.ok) throw new Error('API failed');
                        } catch (err) {
                          // Fallback to localStorage
                          try {
                            const key = 'signalist:watchlist';
                            const raw = localStorage.getItem(key);
                            let list: string[] = raw ? JSON.parse(raw) : [];
                            if (!stock.isInWatchlist) {
                              if (!list.includes(stock.symbol)) list.push(stock.symbol);
                            } else {
                              list = list.filter((s) => s !== stock.symbol);
                            }
                            localStorage.setItem(key, JSON.stringify(list));
                          } catch (e) {
                            console.error('Failed to persist watchlist locally:', e);
                          }
                        }
                      }}
                    >
                      {stock.isInWatchlist ? '★' : '☆'}
                    </button>
                  </li>
              ))}
            </ul>
          )
          }
        </CommandList>
      </CommandDialog>
    </>
  )
}
