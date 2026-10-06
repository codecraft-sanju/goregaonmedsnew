"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api, ApiError, message } from "@/lib/api";
import { Button, Notice, Sheet, Skeleton } from "@/app/ui";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [logout, setLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    const expired = () => {
      setUsername("");
      router.replace("/admin/login");
    };
    window.addEventListener("gm:session-expired", expired);
    api<{ authenticated: boolean; admin: { username: string } }>(
      "/admin/session",
      { signal: c.signal },
    )
      .then((d) => {
        if (d.authenticated) setUsername(d.admin.username);
        else expired();
      })
      .catch((e) => {
        if (c.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) expired();
        else setError(message(e));
      });
    return () => {
      c.abort();
      window.removeEventListener("gm:session-expired", expired);
    };
  }, [router, retry]);
  async function signout() {
    setBusy(true);
    try {
      await api("/admin/logout", { method: "POST", body: {} });
      setUsername("");
      router.replace("/admin/login");
    } catch (e) {
      setError(message(e));
      setLogout(false);
    } finally {
      setBusy(false);
    }
  }
  if (!username)
    return error ? (
      <div className="space-y-4">
        <Notice>{error}</Notice>
        <Button
          onClick={() => {
            setError("");
            setRetry((v) => v + 1);
          }}
        >
          Retry session check
        </Button>
      </div>
    ) : (
      <Skeleton />
    );
  return (
    <>
      <div className="no-print mb-7 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          Signed in as <strong className="text-ink">{username}</strong>
        </span>
        <Button
          variant="secondary"
          className="min-h-10 px-3 py-2 text-xs"
          onClick={() => setLogout(true)}
        >
          <LogOut size={15} />
          Sign out
        </Button>
      </div>
      {error && (
        <div className="mb-5">
          <Notice>{error}</Notice>
        </div>
      )}
      {children}
      <Sheet
        title="Sign out?"
        open={logout}
        onClose={() => setLogout(false)}
        locked={busy}
      >
        <p className="muted mb-5">
          You’ll need to sign in again to manage the pharmacy.
        </p>
        <Button onClick={signout} busy={busy}>
          Sign out
        </Button>
      </Sheet>
    </>
  );
}
