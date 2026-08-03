import { useState, useCallback, useEffect } from "react";

export interface HistoryItem {
  id: string;
  title: string;
  slug: string;
  kind: "article" | "paper";
  domain?: string;
  readAt: string;
}

const HISTORY_KEY = "anv-reading-history";
const MAX_HISTORY = 50;

export function useReadingHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const addToHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const filtered = prev.filter((i) => i.id !== item.id);
      const newHistory = [item, ...filtered].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch {}
      return newHistory;
    });
  }, []);

  const getHistory = useCallback(() => history, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {}
  }, []);

  const isRead = useCallback(
    (id: string) => {
      return history.some((i) => i.id === id);
    },
    [history]
  );

  return { addToHistory, getHistory, clearHistory, isRead, history };
}
