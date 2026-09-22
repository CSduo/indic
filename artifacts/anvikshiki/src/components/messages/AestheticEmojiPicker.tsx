import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Sparkles } from "lucide-react";
import { AESTHETIC_EMOJI_CATEGORIES, ALL_AESTHETIC_EMOJIS, type AestheticEmoji as EmojiItem } from "@/data/aestheticEmojis";
import { AestheticEmoji } from "./AestheticEmoji";

interface AestheticEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
}

export function AestheticEmojiPicker({
  onSelect,
  onClose,
  align = "right",
  className = "",
}: AestheticEmojiPickerProps) {
  const [activeTab, setActiveTab] = useState<string>("wit");
  const [search, setSearch] = useState<string>("");
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  // Focus search input on open
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredEmojis = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      const category = AESTHETIC_EMOJI_CATEGORIES.find((c) => c.id === activeTab);
      return category ? category.emojis : [];
    }
    return ALL_AESTHETIC_EMOJIS.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.keywords.some((k) => k.toLowerCase().includes(query)) ||
        item.emoji.includes(query)
    );
  }, [search, activeTab]);

  return (
    <div
      ref={containerRef}
      className={`z-50 flex flex-col rounded-xl border border-[#374151] bg-[#1a1e23] shadow-2xl overflow-hidden w-[310px] sm:w-[340px] text-[#f3f4f6] animate-in fade-in zoom-in-95 duration-150 ${className}`}
      style={{
        boxShadow: "0 20px 35px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)",
      }}
      role="dialog"
      aria-label="Aesthetic Emoji Picker"
    >
      {/* Header with Search */}
      <div className="border-b border-[#2d333b] p-2.5 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
            <Sparkles size={14} className="text-[#f59e0b]" />
            <span className="tracking-wide">Aesthetic Emojis</span>
            <span className="rounded-full bg-[#f59e0b]/20 px-1.5 py-0.2 font-mono text-[10px] text-[#f59e0b]">
              120+
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#9ca3af] hover:bg-[#2a3038] hover:text-[#f3f4f6] transition-colors"
            aria-label="Close emoji picker"
          >
            <X size={14} />
          </button>
        </div>

        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-[#9ca3af]" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search funny, aesthetic, sacred..."
            className="w-full rounded-lg border border-[#3b434e] bg-[#111317] py-1.5 pl-8 pr-7 text-xs text-[#f3f4f6] placeholder-[#6b7280] focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-[#9ca3af] hover:text-[#f3f4f6]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (if not searching) */}
      {!search && (
        <div className="flex items-center justify-between border-b border-[#2d333b] bg-[#14171b] px-1 py-1">
          {AESTHETIC_EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                title={cat.title}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all ${
                  isActive
                    ? "bg-[#d97706] text-white font-semibold shadow-sm"
                    : "text-[#9ca3af] hover:bg-[#232930] hover:text-[#f3f4f6]"
                }`}
              >
                <AestheticEmoji glyph={cat.icon} size={15} />
                <span className="hidden sm:inline text-[11px]">{cat.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="h-[230px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#3b434e] scrollbar-track-transparent">
        {filteredEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-[#9ca3af]">
            <p className="text-sm">No emojis found</p>
            <p className="text-[11px] text-[#6b7280] mt-1">Try another keyword like "lotus", "dead", "fire"</p>
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
            {filteredEmojis.map((item, idx) => (
              <button
                key={`${item.emoji}-${idx}`}
                type="button"
                onClick={() => {
                  onSelect(item.emoji);
                  onClose();
                }}
                onMouseEnter={() => setHoveredEmoji(item)}
                onMouseLeave={() => setHoveredEmoji(null)}
                className="group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:scale-125 hover:bg-[#2c333d] active:scale-95"
                title={item.name}
              >
                <AestheticEmoji glyph={item.emoji} size={26} className="transform transition-transform group-hover:scale-110" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status / Preview Bar */}
      <div className="flex items-center justify-between border-t border-[#2d333b] bg-[#111317] px-3 py-1.5 text-[11px] text-[#9ca3af]">
        {hoveredEmoji ? (
          <div className="flex items-center gap-1.5 truncate">
            <AestheticEmoji glyph={hoveredEmoji.emoji} size={18} />
            <span className="font-medium text-[#f3f4f6] truncate">{hoveredEmoji.name}</span>
          </div>
        ) : (
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#6b7280]">
            {filteredEmojis.length} emojis · click to send or react
          </span>
        )}
      </div>
    </div>
  );
}
