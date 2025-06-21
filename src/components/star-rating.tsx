"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  count?: number;
  rating: number;
  onRate: (rating: number) => void;
  color?: {
    filled: string;
    unfilled: string;
  };
}

export function StarRating({
  count = 5,
  rating,
  onRate,
  color = {
    filled: "text-accent",
    unfilled: "text-muted-foreground/30",
  },
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const stars = Array(count).fill(0);

  const handleMouseOver = (index: number) => {
    setHoverRating(index + 1);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    onRate(index + 1);
  };

  return (
    <div className="flex items-center space-x-1">
      {stars.map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-5 w-5 cursor-pointer transition-all duration-200",
            (hoverRating || rating) > index ? color.filled : color.unfilled,
            hoverRating > index && "scale-110"
          )}
          onClick={() => handleClick(index)}
          onMouseOver={() => handleMouseOver(index)}
          onMouseLeave={handleMouseLeave}
          fill={(hoverRating || rating) > index ? "currentColor" : "transparent"}
        />
      ))}
    </div>
  );
}
