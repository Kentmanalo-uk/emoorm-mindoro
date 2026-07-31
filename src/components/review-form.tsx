"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "./rating-stars";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  userId: string;
  bookingId: string;
  facilityId?: string;
  storeId?: string;
  reviewType: "product" | "seller";
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  userId,
  bookingId,
  facilityId,
  storeId,
  reviewType,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    if (!comment.trim()) {
      toast({
        title: "Error",
        description: "Please write a review",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          bookingId,
          facilityId,
          storeId,
          reviewType,
          rating,
          title: title || undefined,
          comment,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit review");
      }

      toast({
        title: "Success",
        description: "Your review has been posted!",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-3">
          {reviewType === "product" ? "Product Rating" : "Seller Rating"}
        </label>
        <RatingStars
          rating={rating}
          onRatingChange={setRating}
          interactive
          size="lg"
          showLabel={false}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Title (Optional)
        </label>
        <Input
          placeholder="Summarize your review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2">
          Your Review *
        </label>
        <Textarea
          placeholder="Share your experience with this product/seller..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">{comment.length}/1000</p>
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Posting..." : "Post Review"}
        </Button>
      </div>
    </form>
  );
}
