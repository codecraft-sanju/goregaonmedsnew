"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, ArrowRight } from "lucide-react";
import { Button, Notice, SuccessMark } from "@/app/ui";
export default function SuccessPage() {
  const [id, setId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setId(new URLSearchParams(window.location.search).get("orderId") || "");
  }, []);
  return (
    <div className="mx-auto max-w-lg py-8 text-center">
      <div className="card space-y-6">
        <SuccessMark />
        <div>
          <p className="eyebrow mb-3">Your next step to feeling better</p>
          <h1 className="title">
            {id ? "Order received." : "Your order details"}
          </h1>
          <p className="muted mt-4">
            {id
              ? "The pharmacy will review your order and confirm the bill."
              : "Open tracking to check your order using its Order ID."}
          </p>
        </div>
        {id && (
          <div className="rounded-2xl bg-paper p-5">
            <p className="eyebrow mb-2">Save your order ID</p>
            <p className="text-2xl font-semibold tracking-wider">{id}</p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(id);
                  setCopied(true);
                } catch {
                  setError(
                    "Copy unavailable. Please note your Order ID manually.",
                  );
                }
              }}
            >
              <Copy size={15} />
              {copied ? "Copied" : "Copy order ID"}
            </Button>
          </div>
        )}
        {error && <Notice>{error}</Notice>}
        <Link
          href={`/track${id ? `?orderId=${encodeURIComponent(id)}` : ""}`}
          className="flex min-h-12 items-center justify-center gap-3 rounded-2xl bg-brand p-4 text-sm font-semibold text-white"
        >
          Track order
          <ArrowRight size={18} />
        </Link>
        <Link href="/" className="block text-sm text-muted">
          Back to home
        </Link>
      </div>
    </div>
  );
}
