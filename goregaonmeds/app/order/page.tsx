"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  Pill,
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  ApiError,
  message,
  money,
  normalizeMobile,
  rememberIds,
  cn,
} from "@/lib/api";
import { useSettings } from "../shell";
import { Button, Field, Notice } from "../ui";
const schema = z
  .object({
    clientRequestId: z.string().uuid(),
    customerName: z
      .string()
      .trim()
      .min(2, "Enter your full name (at least 2 characters).")
      .max(80),
    mobileNumber: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
    orderType: z.enum(["manual_text", "prescription_image"]),
    medicines: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Enter the medicine name.").max(120),
          quantity: z
            .string()
            .trim()
            .min(1, "Enter a quantity, e.g. 1 strip.")
            .max(60),
        }),
      )
      .max(30),
    prescriptionUrl: z.string().url().max(500).optional(),
    address: z.object({
      flat: z.string().trim().min(1, "Enter your flat / building.").max(120),
      area: z.string().trim().min(2, "Enter your delivery area.").max(120),
      landmark: z.string().trim().max(120),
    }),
    offerOptIn: z.boolean(),
  })
  .superRefine((v, c) => {
    if (v.orderType === "manual_text" && !v.medicines.length)
      c.addIssue({
        code: "custom",
        path: ["medicines"],
        message: "Add at least one medicine.",
      });
    if (v.orderType === "prescription_image" && !v.prescriptionUrl)
      c.addIssue({
        code: "custom",
        path: ["prescriptionUrl"],
        message: "Upload your prescription first.",
      });
  });
type Payload = z.infer<typeof schema>;
type UploadConfig = {
  cloudName: string;
  apiKey: string;
  folder: string;
  timestamp: number;
  signature: string;
  uploadUrl: string;
};
async function prepareImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP image. Convert HEIC photos before uploading.",
    );
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image smaller than 10 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Image preparation is not supported in this browser.");
  }
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", 0.85),
  );
  if (!blob)
    throw new Error("Could not prepare this image. Try a different photo.");
  if (blob.size > 2 * 1024 * 1024)
    throw new Error(
      "This image is still too large. Please choose a smaller photo.",
    );
  return blob;
}
function uploadImage(
  config: UploadConfig,
  file: Blob,
  onProgress: (n: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const target = new URL(config.uploadUrl);
    if (
      target.protocol !== "https:" ||
      target.hostname !== "api.cloudinary.com"
    ) {
      reject(new Error("Invalid upload destination."));
      return;
    }
    const form = new FormData();
    form.append("file", file, "prescription.jpg");
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(config.timestamp));
    form.append("signature", config.signature);
    form.append("folder", config.folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", config.uploadUrl);
    xhr.timeout = 60000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300 || !data.secure_url)
          throw new Error(data.error?.message || "Upload failed.");
        const url = new URL(data.secure_url);
        if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com")
          throw new Error("Invalid image URL.");
        resolve(data.secure_url);
      } catch (e) {
        reject(e);
      }
    };
    xhr.send(form);
  });
}
export default function OrderPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"manual_text" | "prescription_image">(
    "manual_text",
  );
  const [medicines, setMedicines] = useState([{ name: "", quantity: "" }]);
  const [details, setDetails] = useState({
    customerName: "",
    mobileNumber: "",
    flat: "",
    area: "Goregaon East",
    landmark: "",
  });
  const [offer, setOffer] = useState(false);
  const [prescription, setPrescription] = useState("");
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [frozen, setFrozen] = useState<Payload | null>(null);
  const inFlight = useRef(false);
  const [storageWarning, setStorageWarning] = useState("");
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("mode") === "prescription"
    )
      setMode("prescription_image");
    try {
      const p = sessionStorage.getItem("gm:pending");
      if (p) {
        const parsed = schema.safeParse(JSON.parse(p));
        if (parsed.success) {
          const d = parsed.data;
          setFrozen(d);
          setMode(d.orderType);
          setMedicines(
            d.medicines.length ? d.medicines : [{ name: "", quantity: "" }],
          );
          setDetails({
            customerName: d.customerName,
            mobileNumber: d.mobileNumber,
            ...d.address,
          });
          setPrescription(d.prescriptionUrl || "");
          setOffer(d.offerOptIn);
          setStep(2);
        }
      }
    } catch {
      setStorageWarning(
        "Browser storage is unavailable. Keep this tab open until your order is confirmed.",
      );
    }
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function payload(): Payload {
    return {
      clientRequestId: crypto.randomUUID(),
      customerName: details.customerName,
      mobileNumber: normalizeMobile(details.mobileNumber),
      orderType: mode,
      medicines: mode === "manual_text" ? medicines : [],
      ...(mode === "prescription_image" && prescription
        ? { prescriptionUrl: prescription }
        : {}),
      address: {
        flat: details.flat,
        area: details.area,
        landmark: details.landmark,
      },
      offerOptIn: offer,
    };
  }
  function next() {
    setError("");
    if (step === 0) {
      if (mode === "prescription_image" && !prescription) {
        setError("Upload a clear prescription to continue.");
        return;
      }
      if (
        mode === "manual_text" &&
        medicines.some((m) => !m.name.trim() || !m.quantity.trim())
      ) {
        setError("Add a name and quantity for every medicine.");
        return;
      }
    }
    if (step === 1) {
      const p = schema.safeParse(payload());
      if (!p.success) {
        const fields = Object.fromEntries(
          p.error.issues.map((i) => [i.path.join("."), i.message]),
        );
        setFieldErrors(fields);
        setError(p.error.issues[0].message);
        return;
      }
    }
    setFieldErrors({});
    setStep((s) => s + 1);
  }
  async function upload(file?: File) {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    setProgress(0);
    setPrescription("");
    try {
      const blob = await prepareImage(file);
      const { upload } = await api<{ upload: UploadConfig }>(
        "/uploads/signature",
      );
      const url = await uploadImage(upload, blob, setProgress);
      setPrescription(url);
      setPreview(URL.createObjectURL(blob));
    } catch (e) {
      setError(message(e));
    } finally {
      setUploading(false);
    }
  }
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const parsed = schema.safeParse(frozen || payload());
      if (!parsed.success) {
        setFieldErrors(
          Object.fromEntries(
            parsed.error.issues.map((i) => [i.path.join("."), i.message]),
          ),
        );
        throw new Error(parsed.error.issues[0].message);
      }
      const p = parsed.data;
      setFrozen(p);
      try {
        sessionStorage.setItem("gm:pending", JSON.stringify(p));
      } catch {
        setStorageWarning("Keep this tab open to preserve your safe retry.");
      }
      const result = await api<{
        orderId: string;
        status: "Pending";
        telegramNotificationSent: boolean;
      }>("/orders/create", { method: "POST", body: p });
      rememberIds([result.orderId]);
      try {
        sessionStorage.removeItem("gm:pending");
        sessionStorage.setItem(
          "gm:last-order",
          JSON.stringify({
            orderId: result.orderId,
            mobileLast4: p.mobileNumber.slice(-4),
          }),
        );
      } catch {}
      router.replace(
        `/order/success?orderId=${encodeURIComponent(result.orderId)}`,
      );
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && [400, 413, 422].includes(e.status)) {
        setFrozen(null);
        try {
          sessionStorage.removeItem("gm:pending");
        } catch {}
        setFieldErrors(
          Object.fromEntries(e.fields.map((f) => [f.path, f.message])),
        );
      }
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow mb-3">Care starts with a simple step</p>
        <h1 className="title">Let’s get you feeling better.</h1>
        <p className="muted mt-3">
          Send your needs to your neighbourhood pharmacy.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {["Your medicines", "Delivery details", "Review & send"].map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={cn(
                "mb-2 h-1 rounded-full",
                i <= step ? "bg-brand" : "bg-brand/10",
              )}
            />
            <span
              className={cn(
                "text-[10px] sm:text-xs",
                i === step ? "font-semibold text-brand" : "text-muted",
              )}
            >
              {i + 1}. {s}
            </span>
          </div>
        ))}
      </div>
      {storageWarning && <Notice tone="info">{storageWarning}</Notice>}
      {error && <Notice>{error}</Notice>}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.18 }}
          className="card space-y-6"
        >
          {step === 0 && (
            <>
              <h2 className="text-xl font-semibold">What do you need?</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { v: "manual_text" as const, t: "Medicine list", i: Pill },
                  {
                    v: "prescription_image" as const,
                    t: "Prescription",
                    i: FileText,
                  },
                ].map(({ v, t, i: Icon }) => (
                  <Button
                    key={v}
                    variant="secondary"
                    className={cn(
                      mode === v && "border-brand bg-mint text-brand",
                    )}
                    aria-pressed={mode === v}
                    onClick={() => setMode(v)}
                  >
                    <Icon size={18} />
                    {t}
                  </Button>
                ))}
              </div>
              {mode === "manual_text" ? (
                <div className="space-y-4">
                  {medicines.map((m, i) => (
                    <div key={i} className="rounded-2xl bg-paper p-4">
                      <div className="mb-3 flex justify-between">
                        <span className="eyebrow">Medicine {i + 1}</span>
                        {medicines.length > 1 && (
                          <button
                            aria-label={`Remove medicine ${i + 1}`}
                            onClick={() =>
                              setMedicines((a) => a.filter((_, n) => n !== i))
                            }
                            className="grid size-9 place-items-center rounded-lg text-rose-700"
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
                        <Field
                          label={`Medicine name ${i + 1}`}
                          placeholder="e.g. Dolo 650"
                          value={m.name}
                          maxLength={120}
                          onChange={(e) =>
                            setMedicines((a) =>
                              a.map((x, n) =>
                                n === i ? { ...x, name: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Field
                          label={`Quantity ${i + 1}`}
                          placeholder="e.g. 1 strip"
                          value={m.quantity}
                          maxLength={60}
                          onChange={(e) =>
                            setMedicines((a) =>
                              a.map((x, n) =>
                                n === i
                                  ? { ...x, quantity: e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    disabled={medicines.length >= 30}
                    onClick={() =>
                      setMedicines((a) => [...a, { name: "", quantity: "" }])
                    }
                  >
                    <Plus size={17} />
                    Add medicine
                  </Button>
                  <p className="muted">
                    Up to 30 items. Include the exact strength and quantity you
                    need.
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-brand/20 bg-paper p-6 text-center">
                  <Upload className="mx-auto mb-3 text-brand" size={30} />
                  <h3 className="font-semibold">
                    A clear photo is all it takes
                  </h3>
                  <p className="muted mt-2">
                    JPG, PNG or WebP · up to 10 MB before compression
                  </p>
                  <label className="mt-5 block cursor-pointer rounded-2xl bg-white p-4 text-sm font-semibold text-brand">
                    {uploading
                      ? "Uploading…"
                      : prescription
                        ? "Replace prescription"
                        : "Choose prescription"}
                    <input
                      aria-label="Choose prescription image"
                      className="mt-3 block w-full text-xs"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {uploading && (
                    <div className="mt-4">
                      <progress
                        aria-label="Upload progress"
                        value={progress}
                        max={100}
                        className="w-full accent-[#156253]"
                      />
                      <p className="muted">{progress}%</p>
                    </div>
                  )}
                  {prescription && (
                    <div className="mt-4 space-y-3">
                      {preview && (
                        <img
                          src={preview}
                          alt="Selected prescription"
                          className="mx-auto max-h-64 rounded-2xl object-contain"
                        />
                      )}
                      <Notice tone="success">Prescription uploaded.</Notice>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold">
                Where should we deliver?
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    {
                      key: "customerName",
                      label: "Full name",
                      max: 80,
                      auto: "name",
                    },
                    {
                      key: "mobileNumber",
                      label: "Mobile number",
                      max: 16,
                      auto: "tel",
                    },
                    {
                      key: "flat",
                      label: "Flat / building",
                      max: 120,
                      auto: "address-line1",
                    },
                    {
                      key: "area",
                      label: "Area",
                      max: 120,
                      auto: "address-line2",
                    },
                    {
                      key: "landmark",
                      label: "Landmark (optional)",
                      max: 120,
                      auto: "off",
                    },
                  ] as const
                ).map((f) => (
                  <Field
                    key={f.key}
                    label={f.label}
                    type={f.key === "mobileNumber" ? "tel" : "text"}
                    autoComplete={f.auto}
                    value={details[f.key]}
                    maxLength={f.max}
                    error={
                      fieldErrors[f.key] || fieldErrors[`address.${f.key}`]
                    }
                    onChange={(e) =>
                      setDetails((d) => ({ ...d, [f.key]: e.target.value }))
                    }
                  />
                ))}
              </div>
              {settings?.firstOrderOfferEnabled && (
                <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-5 accent-[#156253]"
                    checked={offer}
                    onChange={(e) => setOffer(e.target.checked)}
                  />
                  <span>
                    <strong>Request my first-order gift</strong>
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      GlucoOne BG-03 on an eligible first medicine order of{" "}
                      {money(settings.firstOrderMinimumMedicineAmount)}+.
                      Non-medicine items excluded. Pharmacy confirms
                      eligibility.
                    </span>
                  </span>
                </label>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-semibold">One last look.</h2>
              {mode === "manual_text" ? (
                <div className="divide-y divide-slate-100">
                  {medicines.map((m, i) => (
                    <div
                      key={i}
                      className="flex justify-between gap-4 py-3 text-sm"
                    >
                      <span>{m.name}</span>
                      <span className="text-muted">{m.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-mint p-4 text-brand">
                  <FileText />
                  Prescription attached
                </div>
              )}
              <div className="rounded-2xl bg-paper p-5">
                <p className="font-semibold">{details.customerName}</p>
                <p className="muted mt-2">
                  {details.flat}, {details.area}
                  {details.landmark ? `, ${details.landmark}` : ""}
                </p>
                <p className="muted mt-1">
                  {normalizeMobile(details.mobileNumber)}
                </p>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery</span>
                <strong>
                  {settings
                    ? settings.deliveryCharge === 0
                      ? "FREE"
                      : money(settings.deliveryCharge)
                    : "Confirmed by pharmacy"}
                </strong>
              </div>
              <Notice tone="info">
                Medicine availability and final amount will be confirmed by your
                pharmacy. Pay at Delivery (Cash/UPI).
              </Notice>
              {frozen && (
                <Notice tone="info">
                  This request is saved for a safe retry. Retry the same order
                  if confirmation has not arrived; its details are locked to
                  avoid duplicate submissions.
                </Notice>
              )}
            </>
          )}
          <div className="flex gap-3 border-t border-slate-100 pt-5">
            {step > 0 && !frozen && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
              >
                <ArrowLeft size={18} />
                Back
              </Button>
            )}
            {step < 2 ? (
              <Button className="ml-auto" disabled={uploading} onClick={next}>
                Continue
                <ArrowRight size={18} />
              </Button>
            ) : (
              <Button className="flex-1" busy={busy} onClick={submit}>
                {frozen ? "Retry order safely" : "Place order"}
                <ArrowRight size={18} />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        <ShieldCheck size={16} />
        Your details go directly to your pharmacy.
      </div>
    </div>
  );
}
