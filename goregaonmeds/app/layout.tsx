import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "./shell";
export const metadata: Metadata = {
  title: {
    default: "GoregaonMeds · Care, closer to home",
    template: "%s · GoregaonMeds",
  },
  description:
    "Order medicines from your neighbourhood pharmacy in Goregaon East. Upload a prescription or send your medicine list.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#156253",
};
// System SF Pro on Apple devices; native system UI fallback elsewhere. No external font request.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
