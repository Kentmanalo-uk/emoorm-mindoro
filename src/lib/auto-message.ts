// Utility to send an automated message to the seller when an order is placed
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypnoqmkjpvqiddfiapys.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwbm9xbWtqcHZxaWRkZmlhcHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjQ0NzEsImV4cCI6MjA4Nzc0MDQ3MX0.Ucd2KGBt8pRiQlaW1-vh_fpzNiMGhmZKjns2rL0sH4k';

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    );
  }
  return _supabase;
}

interface SendOrderAutoMessageParams {
  buyerId: string;
  sellerId: string;
  storeName: string;
  orderId: string;
}

export async function sendOrderAutoMessage({ buyerId, sellerId, storeName, orderId }: SendOrderAutoMessageParams) {
  if (!buyerId || !sellerId || !storeName || !orderId) return;
  // Find or create conversation between buyer and seller
  const supabase = getSupabase();
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('userId', buyerId)
    .eq('id', sellerId)
    .single();

  if (!conversation) {
    // Create conversation if not exists
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ id: sellerId, userId: buyerId, name: storeName })
      .select()
      .single();
    conversation = newConv;
  }

  // Send message
  await supabase.from('messages').insert({
    conversationId: sellerId,
    senderId: buyerId,
    recipientId: sellerId,
    content: `Hi! I just placed an order (Order ID: ${orderId}) at ${storeName}. Looking forward to your confirmation!`,
    createdAt: new Date().toISOString(),
  });
}

interface SendGcashProofMessageParams {
  buyerId: string;
  sellerId: string;
  storeName: string;
  orderId: string;
  gcashRef: string;
  gcashProofUrl: string;
  amount: number;
  date: string;
}

export async function sendGcashProofMessage({
  buyerId,
  sellerId,
  storeName,
  orderId,
  gcashRef,
  gcashProofUrl,
  amount,
  date,
}: SendGcashProofMessageParams) {
  if (!buyerId || !sellerId || !storeName || !orderId) return;
  const supabase = getSupabase();

  // Find or create conversation between buyer and seller
  let { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('userId', buyerId)
    .eq('id', sellerId)
    .single();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ id: sellerId, userId: buyerId, name: storeName })
      .select()
      .single();
    conversation = newConv;
  }

  // Build the GCash proof message with all details
  const proofMessage = [
    `💳 GCash Payment Proof`,
    ``,
    `Order ID: ${orderId}`,
    `Amount: ₱${amount.toLocaleString()}`,
    `Reference No: ${gcashRef}`,
    `Date: ${date}`,
    `Store: ${storeName}`,
    ``,
    `📸 Proof of Payment:`,
    gcashProofUrl,
    ``,
    `Please confirm my payment. Thank you!`,
  ].join('\n');

  await supabase.from('messages').insert({
    conversationId: sellerId,
    senderId: buyerId,
    recipientId: sellerId,
    content: proofMessage,
    createdAt: new Date().toISOString(),
  });

  // Update conversation timestamp
  await supabase
    .from('conversations')
    .update({ lastMessage: '💳 GCash Payment Proof sent', updatedAt: new Date().toISOString() })
    .eq('id', sellerId)
    .eq('userId', buyerId);
}
