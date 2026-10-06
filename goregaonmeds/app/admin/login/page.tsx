"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { api, message } from "@/lib/api";
import { Button, Field, Notice } from "@/app/ui";
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/admin/login", {
        method: "POST",
        body: { username, password },
      });
      router.replace("/admin");
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-md py-10">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-3xl bg-mint text-brand">
          <ShieldCheck size={30} />
        </span>
        <p className="eyebrow mb-3">GoregaonMeds workspace</p>
        <h1 className="title">Welcome back.</h1>
        <p className="muted mt-3">A little care behind every order.</p>
      </div>
      <form className="card space-y-5" onSubmit={login}>
        <Field
          label="Username"
          autoComplete="username"
          value={username}
          maxLength={100}
          required
          onChange={(e) => setUsername(e.target.value)}
        />
        <Field
          label="Password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          maxLength={200}
          required
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="flex min-h-10 items-center gap-2 text-xs text-muted"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}{" "}
          {visible ? "Hide" : "Show"} password
        </button>
        {error && <Notice>{error}</Notice>}
        <Button type="submit" className="w-full" busy={busy}>
          Open workspace →
        </Button>
        <p className="text-center text-xs text-muted">
          For authorised pharmacy staff.
        </p>
      </form>
    </div>
  );
}
