import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error: missing Supabase service role key' },
        { status: 500 }
      );
    }

    // Authenticate the caller — only admins may delete users
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser(authHeader.split(' ')[1]);

    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRow } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerRow?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // Prevent self-deletion
    if (userId === caller.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete related data first (ignore errors for tables that may not have rows)
    const relatedTables = [
      { table: 'cart_items', column: 'userId' },
      { table: 'wishlist', column: 'userId' },
      { table: 'store_followers', column: 'userId' },
      { table: 'bids', column: 'bidderId' },
      { table: 'messages', column: 'senderId' },
      { table: 'bookings', column: 'userId' },
      { table: 'conversations', column: 'userId' },
    ];

    for (const { table, column } of relatedTables) {
      await adminClient.from(table).delete().eq(column, userId);
    }

    // Delete stores owned by this user and their facilities
    const { data: stores } = await adminClient
      .from('stores')
      .select('id')
      .eq('sellerId', userId);

    if (stores && stores.length > 0) {
      const storeIds = stores.map((s: any) => s.id);
      await adminClient.from('facilities').delete().in('storeId', storeIds);
      await adminClient.from('store_followers').delete().in('storeId', storeIds);
      await adminClient.from('stores').delete().eq('sellerId', userId);
    }

    // Delete facilities owned directly by user
    await adminClient.from('facilities').delete().eq('sellerId', userId);

    // Delete the user row from the users table
    await adminClient.from('users').delete().eq('id', userId);

    // Delete from Supabase Auth
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('[delete-user] Auth deletion error:', deleteAuthError.message);
      return NextResponse.json(
        { error: 'User data removed but auth deletion failed: ' + deleteAuthError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-user] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
