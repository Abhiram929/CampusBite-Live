import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function GET() {
  const supabase = getSupabase();
  const [walletResult, ordersResult] = await Promise.all([
    supabase
      .from("wallets")
      .select("name, balance")
      .eq("student_id", CURRENT_STUDENT_ID)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))")
      .eq("student_id", CURRENT_STUDENT_ID)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (walletResult.error) {
    console.error("[GET /api/me] wallet", walletResult.error.message);
    return NextResponse.json({ error: walletResult.error.message }, { status: 500 });
  }
  if (!walletResult.data) {
    console.error(`[GET /api/me] wallet not found for ${CURRENT_STUDENT_ID}`);
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }
  if (ordersResult.error) {
    console.error("[GET /api/me] orders", ordersResult.error.message);
    return NextResponse.json({ error: ordersResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    wallet: walletResult.data,
    orders: ordersResult.data.map((order) => {
      const pickupSlot = firstRelation(order.pickup_slots);
      return {
        id: order.id,
        status: order.status,
        total: order.total,
        pickup_time: pickupSlot ? formatSlot(pickupSlot.slot_time) : null,
        items: order.order_items.map((item) => ({
          name: firstRelation(item.menu_items)?.name ?? "Unknown item",
          quantity: item.quantity,
        })),
      };
    }),
  });
}
