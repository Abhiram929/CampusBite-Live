"use client";

import { useEffect, useState } from "react";

type Relation<T> = T | T[] | null | undefined;
type OrderItem = {
  name?: string;
  quantity?: number;
  menu_items?: Relation<{ name: string }>;
};
type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time?: Relation<string | { slot_time: string }>;
  items?: OrderItem[];
  item_names?: string[];
  order_items?: OrderItem[];
};
type MeData = {
  wallet: { name: string; balance: number };
  orders: Order[];
};

function firstRelation<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function pickupTime(order: Order): string {
  const pickup = firstRelation(order.pickup_time);
  if (typeof pickup === "string") return pickup;
  if (pickup && typeof pickup === "object") {
    const [hours, minutes] = pickup.slot_time.split(":").map(Number);
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "pm" : "am"}`;
  }
  return "Time unavailable";
}

function itemNames(order: Order): string[] {
  if (order.items) {
    return order.items.map((item) => {
      const menuItem = firstRelation(item.menu_items);
      const name = item.name ?? menuItem?.name ?? "Unknown item";
      return item.quantity && item.quantity > 1 ? `${name} x${item.quantity}` : name;
    });
  }
  return order.item_names ?? order.order_items?.map((item) => {
    const name = item.name ?? firstRelation(item.menu_items)?.name ?? "Unknown item";
    return item.quantity && item.quantity > 1 ? `${name} x${item.quantity}` : name;
  }) ?? [];
}

const statusStyles: Record<string, string> = {
  placed: "bg-amber-100 text-amber-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-emerald-100 text-emerald-800",
  collected: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch("/api/me", { signal: requestController.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load wallet and orders");
        if (active) {
          setData(result as MeData);
          setError("");
        }
      } catch (err) {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Could not load wallet and orders");
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
      <div className="border-b border-white/10 p-5">
        <p className="text-sm text-slate-300">{data?.wallet.name ?? "Student wallet"}</p>
        <p className="mt-1 text-3xl font-semibold">
          Rs {data ? data.wallet.balance : "—"}
        </p>
        <p className="mt-1 text-xs text-slate-400">Wallet balance</p>
      </div>
      <div>
        <div className="px-5 pb-2 pt-4">
          <h2 className="font-semibold">My orders today</h2>
        </div>
        {error && <p className="px-5 pb-3 text-sm text-red-300">{error}</p>}
        {!error && data?.orders.length === 0 && (
          <p className="px-5 pb-5 text-sm text-slate-300">No orders yet today.</p>
        )}
        {data?.orders.map((order) => (
          <article key={order.id} className="border-t border-white/10 px-5 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Order #{order.id}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  statusStyles[order.status] ?? "bg-slate-700 text-slate-200"
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">Pickup {pickupTime(order)}</p>
            <p className="mt-1 text-sm text-slate-200">
              {itemNames(order).join(", ") || "Items unavailable"}
            </p>
            <p className="mt-1 text-sm font-medium">Total: Rs {order.total}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
