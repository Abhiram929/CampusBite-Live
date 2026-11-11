"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Relation<T> = T | T[] | null | undefined;

type KitchenItem = {
  name: string;
  quantity: number;
};

type KitchenOrder = {
  id: number;
  status: "placed" | "preparing" | "ready";
  total: number;
  student_name: Relation<string | { name: string }>;
  pickup_time: Relation<string | { slot_time: string }>;
  items: Relation<KitchenItem[]>;
};

const columns: {
  status: KitchenOrder["status"];
  title: string;
  action: string;
  nextStatus: "preparing" | "ready" | "collected";
  buttonClass: string;
}[] = [
  {
    status: "placed",
    title: "New orders",
    action: "Start preparing",
    nextStatus: "preparing",
    buttonClass: "bg-amber-400 text-slate-950 hover:bg-amber-300",
  },
  {
    status: "preparing",
    title: "Preparing",
    action: "Mark ready",
    nextStatus: "ready",
    buttonClass: "bg-sky-400 text-slate-950 hover:bg-sky-300",
  },
  {
    status: "ready",
    title: "Ready for pickup",
    action: "Collected",
    nextStatus: "collected",
    buttonClass: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  },
];

function firstRelation<T>(relation: Relation<T>): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function displayStudent(relation: KitchenOrder["student_name"]): string {
  const student = firstRelation(relation);
  return typeof student === "string" ? student : student?.name ?? "Unknown student";
}

function displayPickupTime(relation: KitchenOrder["pickup_time"]): string {
  const pickup = firstRelation(relation);
  if (!pickup) return "Time unavailable";
  if (typeof pickup === "string") return pickup;

  const [hours, minutes] = pickup.slot_time.split(":").map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "pm" : "am"}`;
}

function displayItems(relation: KitchenOrder["items"]): KitchenItem[] {
  const items = firstRelation(relation);
  return Array.isArray(items) ? items : [];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [error, setError] = useState("");
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);

  const loadOrders = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/kitchen", { signal, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load kitchen orders");
      setOrders(result.orders as KitchenOrder[]);
      setError("");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Could not load kitchen orders");
    }
  }, []);

  useEffect(() => {
    let controller = new AbortController();
    void loadOrders(controller.signal);

    const interval = window.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      void loadOrders(controller.signal);
    }, 3000);

    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [loadOrders]);

  async function advanceOrder(order: KitchenOrder, status: "preparing" | "ready" | "collected") {
    setLoadingOrderId(order.id);
    setError("");
    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update order");
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setLoadingOrderId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 md:px-8">
      <header className="mx-auto mb-8 flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">CampusBite · SRM</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Kitchen board</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
          <Link href="/" className="text-sm text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white">
            Student screen
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-3">
          {columns.map((column) => {
            const columnOrders = orders.filter((order) => order.status === column.status);
            return (
              <section key={column.status} className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{column.title}</h2>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnOrders.map((order) => (
                    <article key={order.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">Order #{order.id}</h3>
                          <p className="mt-1 text-sm text-slate-400">{displayStudent(order.student_name)}</p>
                        </div>
                        <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-sm font-medium text-slate-200">
                          {displayPickupTime(order.pickup_time)}
                        </span>
                      </div>

                      <ul className="my-4 space-y-2 border-y border-slate-800 py-3 text-sm">
                        {displayItems(order.items).map((item, index) => (
                          <li key={`${item.name}-${index}`} className="flex justify-between gap-3">
                            <span className="text-slate-200">{item.name}</span>
                            <span className="shrink-0 text-slate-400">× {item.quantity}</span>
                          </li>
                        ))}
                        {displayItems(order.items).length === 0 && (
                          <li className="text-slate-400">Items unavailable</li>
                        )}
                      </ul>

                      <div className="mb-4 flex justify-between text-sm">
                        <span className="text-slate-400">Total</span>
                        <span className="font-semibold">Rs {order.total}</span>
                      </div>

                      <button
                        type="button"
                        disabled={loadingOrderId !== null}
                        onClick={() => void advanceOrder(order, column.nextStatus)}
                        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${column.buttonClass}`}
                      >
                        {loadingOrderId === order.id ? "Updating..." : column.action}
                      </button>
                    </article>
                  ))}

                  {columnOrders.length === 0 && (
                    <p className="rounded-2xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">
                      No orders
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
