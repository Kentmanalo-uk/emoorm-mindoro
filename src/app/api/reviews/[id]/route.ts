import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/supabase/config";

// PATCH /api/reviews/[id] - Update a review
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error: missing Supabase service role key" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { id } = await params;
    const body = await req.json();
    const { userId, rating, title, comment } = body;

    // Verify ownership
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (review.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to update this review" },
        { status: 403 }
      );
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Update review
    const { data: updatedReview, error: updateError } = await supabase
      .from("reviews")
      .update({
        rating: rating !== undefined ? rating : review.rating,
        title: title || review.title,
        comment: comment || review.comment,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Review update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    // Update facility/store rating
    if (review.reviewType === "product" && review.facilityId) {
      const { data: ratings } = await supabase.rpc(
        "get_product_rating",
        { facility_id: review.facilityId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("facilities")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", review.facilityId);
      }
    } else if (review.reviewType === "seller" && review.storeId) {
      const { data: ratings } = await supabase.rpc(
        "get_seller_rating",
        { store_id: review.storeId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("stores")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", review.storeId);
      }
    }

    return NextResponse.json(updatedReview, { status: 200 });
  } catch (error) {
    console.error("Review update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Delete a review
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    // Verify ownership
    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (review.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized to delete this review" },
        { status: 403 }
      );
    }

    // Delete review
    const { error: deleteError } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Review delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete review" },
        { status: 500 }
      );
    }

    // Update facility/store rating
    if (review.reviewType === "product" && review.facilityId) {
      const { data: ratings } = await supabase.rpc(
        "get_product_rating",
        { facility_id: review.facilityId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("facilities")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", review.facilityId);
      }
    } else if (review.reviewType === "seller" && review.storeId) {
      const { data: ratings } = await supabase.rpc(
        "get_seller_rating",
        { store_id: review.storeId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("stores")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", review.storeId);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Review delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
