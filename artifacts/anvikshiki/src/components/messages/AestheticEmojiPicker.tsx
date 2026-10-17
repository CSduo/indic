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
  const [activeTab, setActiveTab] = useState<string>("faces");
  const [search, setSearch] = useState<string>("");
  const [hoveredEmoji, setHoveredEmoji] = useState<EmojiItem | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click or touch
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [onClose]);

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
      className={`z-50 flex flex-col rounded-xl border border-[#404040] bg-[#1e1e1e] shadow-2xl overflow-hidden w-[310px] sm:w-[340px] text-[#f4f4f4] animate-in fade-in zoom-in-95 duration-150 ${className}`}
      style={{
        boxShadow: "0 20px 35px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)",
      }}
      role="dialog"
      aria-label="Aesthetic Emoji Picker"
    >
      {/* Header with Search */}
      <div className="border-b border-[#323232] p-2.5 pb-2">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c84a10]">
            <Sparkles size={14} className="text-[#c84a10]" />
            <span className="tracking-wide">Aesthetic Reactions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#a2a2a2] hover:bg-[#2f2f2f] hover:text-[#f4f4f4] transition-colors"
            aria-label="Close emoji picker"
          >
            <X size={14} />
          </button>
        </div>

        <div className="relative flex items-center">
          <Search size={13} className="absolute left-2.5 text-[#a2a2a2]" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search funny, aesthetic, sacred..."
            className="w-full rounded-lg border border-[#424242] bg-[#131313] py-1.5 pl-8 pr-7 text-xs text-[#f4f4f4] placeholder-[#727272] focus:border-[#c84a10] focus:outline-none focus:ring-1 focus:ring-[#c84a10] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 text-[#a2a2a2] hover:text-[#f4f4f4]"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs (if not searching) */}
      {!search && (
        <div className="flex items-center justify-between border-b border-[#323232] bg-[#171717] px-1.5 py-1">
          {AESTHETIC_EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                title={cat.title}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? "bg-[#c84a10] text-white font-semibold shadow-sm"
                    : "text-[#a2a2a2] hover:bg-[#282828] hover:text-[#f4f4f4]"
                }`}
              >
                <AestheticEmoji glyph={cat.icon} size={17} />
                <span className="hidden sm:inline text-[11px]">{cat.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="h-[235px] overflow-y-auto p-2.5 scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent">
        {filteredEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-[#a2a2a2]">
            <p className="text-sm">No emojis found</p>
            <p className="text-[11px] text-[#727272] mt-1">Try another keyword like "lotus", "dead", "fire"</p>
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
                className="group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-100 hover:scale-130 hover:bg-[rgba(156,156,156,0.2)] hover:shadow-md active:scale-95"
                title={item.name}
              >
                <AestheticEmoji glyph={item.emoji} size={28} className="transform transition-transform group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status / Preview Bar */}
      <div className="flex items-center justify-between border-t border-[#323232] bg-[#131313] px-3 py-2 text-[11px] text-[#a2a2a2]">
        {hoveredEmoji ? (
          <div className="flex items-center gap-2 truncate">
            <AestheticEmoji glyph={hoveredEmoji.emoji} size={20} />
            <span className="font-semibold text-[#f4f4f4] truncate">{hoveredEmoji.name}</span>
          </div>
        ) : (
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#727272]">
            Tap an emoji to react
          </span>
        )}
      </div>
    </div>
  );
}
