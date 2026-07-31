"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewForm } from "./review-form";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  bookingId: string;
  facilityId?: string;
  facilityName?: string;
  storeId?: string;
  storeName?: string;
  reviewType: "product" | "seller";
}

export function ReviewModal({
  open,
  onOpenChange,
  userId,
  bookingId,
  facilityId,
  facilityName,
  storeId,
  storeName,
  reviewType,
}: ReviewModalProps) {
  const title =
    reviewType === "product"
      ? `How do you rate ${facilityName || "this product"}?`
      : `How was your experience with ${storeName || "this seller"}?`;

  const description =
    reviewType === "product"
      ? "Share your feedback to help other buyers make informed decisions."
      : "Help future customers learn about this store's service.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ReviewForm
          userId={userId}
          bookingId={bookingId}
          facilityId={facilityId}
          storeId={storeId}
          reviewType={reviewType}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
