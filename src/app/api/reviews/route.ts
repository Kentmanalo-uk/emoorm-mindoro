import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "@/supabase/config";

// POST /api/reviews - Create a new review
export async function POST(req: NextRequest) {
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
    const body = await req.json();
    const {
      userId,
      bookingId,
      facilityId,
      storeId,
      reviewType, // 'product' or 'seller'
      rating,
      title,
      comment,
    } = body;

    // Validation
    if (!userId || !reviewType || !rating) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (reviewType === "product" && !facilityId) {
      return NextResponse.json(
        { error: "facilityId required for product reviews" },
        { status: 400 }
      );
    }

    if (reviewType === "seller" && !storeId) {
      return NextResponse.json(
        { error: "storeId required for seller reviews" },
        { status: 400 }
      );
    }

    // Verify user has actually purchased the product/from the store
    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .eq("userId", userId)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json(
          { error: "Booking not found or unauthorized" },
          { status: 403 }
        );
      }

      // Verify the booking is for the correct facility/store
      if (reviewType === "product" && booking.facilityId !== facilityId) {
        return NextResponse.json(
          { error: "Booking does not match facility" },
          { status: 403 }
        );
      }

      if (reviewType === "seller" && booking.storeId !== storeId) {
        return NextResponse.json(
          { error: "Booking does not match store" },
          { status: 403 }
        );
      }
    }

    // Check if user already reviewed this product/seller from this booking
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("userId", userId)
      .eq("bookingId", bookingId)
      .eq("reviewType", reviewType)
      .single();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this" },
        { status: 409 }
      );
    }

    // Create the review
    const { data: newReview, error: insertError } = await supabase
      .from("reviews")
      .insert([
        {
          userId,
          bookingId,
          facilityId,
          storeId,
          reviewType,
          rating,
          title,
          comment,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Review insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create review" },
        { status: 500 }
      );
    }

    // Update facility/store rating in denormalized field
    if (reviewType === "product" && facilityId) {
      const { data: ratings } = await supabase.rpc(
        "get_product_rating",
        { facility_id: facilityId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("facilities")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", facilityId);
      }
    } else if (reviewType === "seller" && storeId) {
      const { data: ratings } = await supabase.rpc(
        "get_seller_rating",
        { store_id: storeId }
      );

      if (ratings && ratings[0]) {
        await supabase
          .from("stores")
          .update({ rating: Math.round(ratings[0].avgRating) })
          .eq("id", storeId);
      }
    }

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/reviews - Fetch reviews with filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const facilityId = searchParams.get("facilityId");
    const storeId = searchParams.get("storeId");
    const reviewType = searchParams.get("reviewType");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let query = supabase
      .from("reviews")
      .select(
        `
        *,
        users:userId (id, firstName, lastName),
        facility:facilityId (name, imageUrl),
        store:storeId (name)
      `,
        { count: "exact" }
      );

    if (facilityId) {
      query = query.eq("facilityId", facilityId);
    }

    if (storeId) {
      query = query.eq("storeId", storeId);
    }

    if (reviewType) {
      query = query.eq("reviewType", reviewType);
    }

    query = query.order("createdAt", { ascending: false });

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Review fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data,
        total: count,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Review fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
