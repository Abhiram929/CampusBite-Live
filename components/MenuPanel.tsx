"use client";

import { useEffect, useState } from "react";

type MenuItem = {
  id: number;
  name: string;
  category: "meal" | "snack" | "sweet" | "drink";
  price: number;
  is_veg: boolean;
  stock: number;
};

const categories: { id: MenuItem["category"]; label: string }[] = [
  { id: "meal", label: "Meals" },
  { id: "snack", label: "Snacks" },
  { id: "sweet", label: "Sweets" },
  { id: "drink", label: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    async function load() {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      try {
        const response = await fetch("/api/menu", { signal: requestController.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load the menu");
        if (active) {
          setItems(result.items as MenuItem[]);
          setError("");
        }
      } catch (err) {
        if (active && !(err instanceof DOMException && err.name === "AbortError")) {
          setError(err instanceof Error ? err.message : "Could not load the menu");
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold">Today&apos;s menu</h2>
        <p className="mt-1 text-xs text-slate-500">Freshly updated from the canteen</p>
      </div>
      {error && <p className="p-5 text-sm text-red-600">{error}</p>}
      {!error && (
        <div className="divide-y divide-slate-100">
          {categories.map((category) => {
            const categoryItems = items.filter((item) => item.category === category.id);
            if (categoryItems.length === 0) return null;
            return (
              <div key={category.id} className="px-5 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {category.label}
                </h3>
                <ul className="space-y-2">
                  {categoryItems.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                            item.is_veg ? "bg-green-600" : "bg-red-600"
                          }`}
                        />
                        <span className="truncate">{item.name}</span>
                        {item.stock === 0 ? (
                          <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                            Sold out
                          </span>
                        ) : item.stock <= 3 ? (
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                            Only {item.stock} left
                          </span>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-medium">Rs {item.price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {items.length === 0 && <p className="p-5 text-sm text-slate-500">No menu items available.</p>}
        </div>
      )}
    </section>
  );
}
