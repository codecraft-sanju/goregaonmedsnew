import Link from "next/link";
export default function NotFound() {
  return (
    <div className="card mx-auto max-w-lg py-14 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="title">A little off the path.</h1>
      <p className="muted my-5">
        This page isn’t available. Let’s get you back to your care.
      </p>
      <Link
        href="/"
        className="inline-block rounded-2xl bg-brand px-6 py-4 text-sm font-semibold text-white"
      >
        Back home
      </Link>
    </div>
  );
}
