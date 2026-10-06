"use client";
import { Button, Notice } from "./ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="title">Let’s try that again.</h1>
      <Notice>
        This page could not be loaded. Your saved orders are still with the
        pharmacy.
      </Notice>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
