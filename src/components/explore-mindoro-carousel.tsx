"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MINDORO_CITIES } from "@/lib/mindoro-cities-data";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselRef {
  current: HTMLDivElement | null;
}

export function ExploreMindoroCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);

  // Check scroll position to enable/disable arrow buttons
  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      setCanScrollPrev(
        scrollRef.current.scrollLeft + scrollRef.current.clientWidth <
          scrollRef.current.scrollWidth,
      );
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", checkScroll);
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 350; // Approximate width of card + gap
      if (direction === "left") {
        scrollRef.current.scrollBy({
          left: -scrollAmount,
          behavior: "smooth",
        });
      } else {
        scrollRef.current.scrollBy({
          left: scrollAmount,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <section className="relative mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-headline font-normal tracking-[-0.04em]">
            Explore Oriental Mindoro
          </h2>
        </div>
      </div>

      {/* Carousel Container with Navigation */}
      <div className="relative group">
        {/* Left Arrow - Hidden on mobile */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center h-10 w-10 rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:bg-primary hover:text-white group-hover:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0"
        >
          <div className="flex gap-4 min-w-max pb-2">
            {MINDORO_CITIES.map((city) => (
              <Link
                key={city.id}
                href={`/explore/${city.slug}`}
                className="relative shrink-0 w-[280px] md:w-[320px] h-[200px] md:h-[240px] rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] group/card hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-300"
              >
                {/* Background Image */}
                <Image
                  src={city.imageUrl}
                  alt={city.name}
                  fill
                  className="object-cover group-hover/card:scale-110 transition-transform duration-300"
                  sizes="(max-width: 768px) 280px, 320px"
                />

                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60 group-hover/card:from-black/30 group-hover/card:via-black/40 group-hover/card:to-black/70 transition-all" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
                  <h3 className="text-lg md:text-xl font-headline font-normal tracking-[-0.03em] text-white mb-1">
                    Explore {city.displayName}
                  </h3>
                  <p className="text-xs md:text-sm text-white/80 line-clamp-2">
                    {city.description}
                  </p>
                </div>

                {/* Arrow Icon - appears on hover */}
                <div className="absolute top-4 right-4 md:top-6 md:right-6 h-8 w-8 md:h-10 md:w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover/card:bg-white/40 group-hover/card:scale-110 transition-all">
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Arrow - Hidden on mobile */}
        {canScrollPrev && (
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 items-center justify-center h-10 w-10 rounded-full bg-white shadow-md hover:shadow-lg transition-all hover:bg-primary hover:text-white group-hover:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </section>
  );
}
