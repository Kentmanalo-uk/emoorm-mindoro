import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function RatingStars({
  rating,
  onRatingChange,
  interactive = false,
  size = "md",
  showLabel = true,
}: RatingStarsProps) {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }[size];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRatingChange?.(star)}
            disabled={!interactive}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
            )}
          >
            <Star
              className={cn(
                sizeClass,
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300",
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && (
        <span className="text-sm font-semibold">
          {rating.toFixed(1)} ({rating}/5)
        </span>
      )}
    </div>
  );
}
