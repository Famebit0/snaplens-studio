import { Lens } from "@/lib/camera-kit";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface LensCarouselProps {
  lenses: Lens[];
  activeLensId: string | null;
  onSelectLens: (lens: Lens | null) => void;
}

const LENS_COLORS = [
  "from-snap-yellow to-snap-green",
  "from-snap-blue to-snap-purple",
  "from-snap-purple to-snap-red",
  "from-snap-green to-snap-blue",
  "from-snap-red to-snap-yellow",
];

const LENS_LABELS = ["Fun Face", "Glow Up", "Vibe Check", "Mood Ring", "Party Mode"];

export default function LensCarousel({ lenses, activeLensId, onSelectLens }: LensCarouselProps) {
  return (
    <div className="w-full animate-slide-up">
      <div className="flex items-center gap-3 overflow-x-auto px-4 pb-2 pt-1 scrollbar-hide">
        {/* No filter option */}
        <button
          onClick={() => onSelectLens(null)}
          className={cn(
            "flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-200",
            activeLensId === null ? "scale-110" : "opacity-60"
          )}
        >
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all",
              activeLensId === null
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/30 bg-secondary"
            )}
          >
            <span className="text-xs font-bold text-foreground">OFF</span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">No Filter</span>
        </button>

        {lenses.map((lens, i) => {
          const isActive = activeLensId === lens.id;
          const colorClass = LENS_COLORS[i % LENS_COLORS.length];
          const label = lens.name || LENS_LABELS[i % LENS_LABELS.length];

          return (
            <button
              key={lens.id}
              onClick={() => onSelectLens(lens)}
              className={cn(
                "flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-200",
                isActive ? "scale-110" : "opacity-60 hover:opacity-80"
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -inset-1 lens-ring rounded-full animate-pulse-ring" />
                )}
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br transition-all",
                    colorClass,
                    isActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
                  )}
                >
                  {lens.iconUrl ? (
                    <img
                      src={lens.iconUrl}
                      alt={label}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-primary-foreground" />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground max-w-[60px] truncate">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
