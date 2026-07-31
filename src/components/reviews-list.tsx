"use client";

import React, { useState, useEffect } from "react";
import { useUser, useSupabase } from "@/supabase";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RatingStars } from "./rating-stars";
import { ThumbsUp, ThumbsDown, Trash2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  helpful: number;
  unhelpful: number;
  users?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface ReviewsListProps {
  facilityId?: string;
  storeId?: string;
  reviewType: "product" | "seller";
  limit?: number;
}

export function ReviewsList({
  facilityId,
  storeId,
  reviewType,
  limit = 20,
}: ReviewsListProps) {
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
  }, [facilityId, storeId, reviewType]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        reviewType,
        limit: limit.toString(),
      });

      if (facilityId) params.append("facilityId", facilityId);
      if (storeId) params.append("storeId", storeId);

      const response = await fetch(`/api/reviews?${params}`);
      if (!response.ok) throw new Error("Failed to load reviews");

      const { data, total } = await response.json();
      setReviews(data);
      setTotalReviews(total);

      if (data.length > 0) {
        const avg =
          data.reduce((sum: number, r: Review) => sum + r.rating, 0) /
          data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      const response = await fetch(
        `/api/reviews/${reviewId}?userId=${user?.uid}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete review");

      toast({ title: "Success", description: "Review deleted" });
      loadReviews();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      {totalReviews > 0 && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="flex items-start gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold">
                {averageRating.toFixed(1)}
              </div>
              <RatingStars
                rating={Math.round(averageRating * 2) / 2}
                size="sm"
                showLabel={false}
              />
              <p className="text-sm text-gray-600 mt-2">
                {totalReviews} reviews
              </p>
            </div>

            <div className="flex-1">
              {/* Star distribution would go here */}
              <div className="text-sm text-gray-600">
                Based on {totalReviews} verified{" "}
                {reviewType === "product" ? "buyer" : "customer"} reviews
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {getInitials(
                        review.users?.firstName,
                        review.users?.lastName,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {review.users?.firstName} {review.users?.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <RatingStars
                      rating={review.rating}
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                </div>

                {user?.uid === review.userId && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        /* TODO: Implement edit */
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>

              {review.title && (
                <h4 className="font-semibold mt-2">{review.title}</h4>
              )}
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                {review.comment}
              </p>

              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <button className="flex items-center gap-1 hover:text-green-600">
                  <ThumbsUp className="w-4 h-4" />
                  Helpful ({review.helpful})
                </button>
                <button className="flex items-center gap-1 hover:text-red-600">
                  <ThumbsDown className="w-4 h-4" />
                  Not helpful ({review.unhelpful})
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No reviews yet. Be the first to review!
        </div>
      )}
    </div>
  );
}
