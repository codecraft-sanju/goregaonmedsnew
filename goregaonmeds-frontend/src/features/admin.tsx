// src/features/admin.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HeartPulse,
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  Settings as SettingsIcon,
  Activity,
  ArrowUpRight,
  LogOut,
  Search,
  Plus,
  RefreshCw,
  IndianRupee,
  ShoppingBag,
  Clock,
  CheckCheck,
  Trash2,
  Save,
  Camera,
  Image as ImageIcon,
  Crop,
  ZoomIn,
  ZoomOut,
  X,
  Pill,
  Check,
  QrCode,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  api,
  send,
  Order,
  Product,
  Pagination,
  Settings,
  Line,
  money,
  date,
  productId,
  ApiError,
} from '@/lib/api';
import { useSession } from '@/lib/hooks';
import {
  PageHeading,
  Loading,
  Empty,
  ErrorState,
  Pager,
  Status,
  Modal,
  MetricsSkeleton,
  TableSkeleton,
} from '@/components/ui';
import { Brand } from '@/components/shell';
import Login from './auth';

const nav = [
  ['/admin/', 'Overview', LayoutDashboard],
  ['/admin/orders/', 'Orders', Package],
  ['/admin/products/', 'Products', Boxes],
  ['/admin/customers/', 'Customers', Users],
  ['/admin/poster/', 'QR Poster', QrCode],
  ['/admin/settings/', 'Settings', SettingsIcon],
  ['/admin/logs/', 'System logs', Activity],
] as const;

export default function Admin({ view = 'overview' }: { view?: string }) {
  const auth = useSession(true),
    path = usePathname(),
    qc = useQueryClient();

  const logout = useMutation({
    mutationFn: () => send('/admin/logout'),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ['admin'] });
      window.location.assign('/admin/login/');
    },
  });

  if (view === 'login') return <Login admin />;

  // Auto-detect poster view from URL path even if view prop wasn't explicitly set
  const activeView =
    path?.startsWith('/admin/poster') ? 'poster' : view;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand />
        <div className="workspace-label">PHARMACY WORKSPACE</div>
        <nav>
          {nav.map(([href, label, Icon]) => (
            <Link
              className={
                path === href || path === href.slice(0, -1) ? 'active' : ''
              }
              href={href}
              key={href}
            >
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="workspace-note">
            <HeartPulse size={20} />
            <p>
              A little care.
              <br />
              Every order.
            </p>
          </div>
          <Link href="/" className="text-link">
            Visit storefront
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="text-link"
            disabled={logout.isPending || !auth.data}
            onClick={() => logout.mutate()}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <span>
            Workspace /{' '}
            {nav.find((n) => n[0] === path || n[0].slice(0, -1) === path)?.[1] ??
              'Overview'}
          </span>
          <span className="admin-identity">
            <span className="green-dot" />
            {auth.data?.admin?.username ?? 'Pharmacy team'}
          </span>
        </header>
        <main>
          {logout.error && <ErrorState error={logout.error} />}{' '}
          {auth.isPending ? (
            <Loading />
          ) : auth.error ? (
            <>
              <PageHeading
                eyebrow="PHARMACY WORKSPACE"
                title="Welcome to your workspace."
              />
              <ErrorState error={auth.error} retry={() => auth.refetch()} />
              <div className="admin-welcome">
                <LayoutDashboard size={44} />
                <h2>One thoughtful space for daily operations.</h2>
                <p>
                  Orders, billing, products, and reporting will appear when the
                  pharmacy service is connected.
                </p>
                <Link href="/admin/login/" className="btn">
                  Go to admin sign-in
                </Link>
              </div>
            </>
          ) : !auth.data ? (
            <Empty title="Your pharmacy workspace">
              <p>Sign in to view orders, stock, and reporting.</p>
              <Link className="btn" href="/admin/login/">
                Admin sign-in
              </Link>
            </Empty>
          ) : activeView === 'overview' ? (
            <Overview />
          ) : activeView === 'orders' ? (
            <AdminOrders />
          ) : activeView === 'products' ? (
            <AdminProducts />
          ) : activeView === 'customers' ? (
            <Customers />
          ) : activeView === 'poster' ? (
            <AdminPosterStudio />
          ) : activeView === 'settings' ? (
            <AdminSettings />
          ) : (
            <Logs />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview() {
  const [start, setStart] = useState(''),
    [end, setEnd] = useState('');
  const valid = (!start && !end) || (!!start && !!end && start <= end);
  const q = useQuery({
    queryKey: ['admin', 'analytics', start, end],
    queryFn: () =>
      api<{
        totalSales: number;
        totalOrders: number;
        breakdown: { pending: number; delivered: number };
      }>(
        `/admin/analytics/overview?${start ? `startDate=${start}&endDate=${end}` : 'allTime=true'}`,
      ),
    enabled: valid,
  });

  const cards = [
    {
      icon: IndianRupee,
      label: 'Sales delivered in period',
      value: money(q.data?.totalSales),
    },
    { icon: ShoppingBag, label: 'Orders placed', value: q.data?.totalOrders },
    {
      icon: Clock,
      label: 'Pending among placed orders',
      value: q.data?.breakdown.pending,
    },
    {
      icon: CheckCheck,
      label: 'Orders delivered in period',
      value: q.data?.breakdown.delivered,
    },
  ];

  return (
    <>
      <PageHeading
        eyebrow="A CLEARER VIEW OF YOUR DAY"
        title="Good care. Well managed."
      >
        Your pharmacy at a glance, with figures from your live backend.
      </PageHeading>
      <div className="date-controls">
        <label>
          From
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <button
          className="btn secondary"
          onClick={() => {
            setStart('');
            setEnd('');
          }}
        >
          All time
        </button>
      </div>
      {!valid ? (
        <p className="field-error">Choose a valid start and end date.</p>
      ) : q.isPending ? (
        <MetricsSkeleton />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        <div className="metric-grid">
          {cards.map((c) => (
            <div className="metric panel" key={c.label}>
              <div>
                <c.icon size={21} />
                <span>{start ? 'SELECTED PERIOD' : 'ALL TIME'}</span>
              </div>
              <strong>{c.value ?? '—'}</strong>
              <p>{c.label}</p>
            </div>
          ))}
        </div>
      )}
      <p className="fine-print">
        Placed-order metrics use creation dates. Sales and delivered metrics use
        delivery dates. These counts are different cohorts and need not add up.
      </p>
      <div
        className="admin-quick-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}
      >
        <Link href="/admin/orders/" className="panel">
          <Package size={28} />
          <h2>Keep orders moving.</h2>
          <p>Review pending orders, prepare bills, and manage fulfilment.</p>
          <span className="text-link">
            Open orders
            <ArrowUpRight size={17} />
          </span>
        </Link>
        <Link href="/admin/products/" className="panel">
          <Boxes size={28} />
          <h2>A well-kept shelf.</h2>
          <p>Update your catalog, availability, and tracked inventory.</p>
          <span className="text-link">
            Manage products
            <ArrowUpRight size={17} />
          </span>
        </Link>
        <Link href="/admin/poster/" className="panel">
          <QrCode size={28} />
          <h2>A4 QR Poster Studio.</h2>
          <p>
            Download 300-DPI A4 print-ready posters with your QR code to share
            on WhatsApp for shop printing.
          </p>
          <span className="text-link">
            Create A4 poster
            <ArrowUpRight size={17} />
          </span>
        </Link>
      </div>
    </>
  );
}

// ============================================================================
// IN-APP 300-DPI A4 QR POSTER STUDIO (ZERO EXTERNAL LIBRARIES REQUIRED)
// ============================================================================
const A4_W = 2480; // 300 DPI exact A4 width in px
const A4_H = 3508; // 300 DPI exact A4 height in px

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function AdminPosterStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Editable Poster Fields
  const [targetUrl, setTargetUrl] = useState('https://goregaonmeds.com');
  const [topBadge, setTopBadge] = useState(
    "GOREGAON'S TRUSTED ONLINE PHARMACY",
  );
  const [brandTitle, setBrandTitle] = useState('GOREGAONMEDS.COM');
  const [offerBadge, setOfferBadge] = useState('SPECIAL LAUNCH OFFER');
  const [mainOffer, setMainOffer] = useState('FREE GIFT ON 1ST ORDER');
  const [subOffer, setSubOffer] = useState(
    'Order Medicines & Healthcare Essentials Online',
  );
  const [deliveryHighlight, setDeliveryHighlight] = useState(
    'Superfast Home Delivery in Goregaon East',
  );
  const [scanCta, setScanCta] = useState('SCAN QR CODE TO ORDER NOW');
  const [shopsLine, setShopsLine] = useState(
    'Apple Pharmacy  •  Lotus Pharmacy  •  Health Zone Pharmacy',
  );
  const [contactLine, setContactLine] = useState(
    '100% Genuine Medicines  •  Fulfilled By Our Own Pharmacy Staff',
  );

  // Load high-resolution QR image whenever targetUrl changes
  useEffect(() => {
    const cleanUrl = targetUrl.trim() || 'https://goregaonmeds.com';
    setQrLoading(true);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setQrImg(img);
      setQrLoading(false);
    };
    img.onerror = () => {
      setQrLoading(false);
    };
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&ecc=H&margin=1&color=193c35&bgcolor=ffffff&data=${encodeURIComponent(
      cleanUrl,
    )}`;
  }, [targetUrl]);

  // Draw complete 300-DPI A4 Poster onto HTML5 Canvas
  const renderPosterCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Deep Pharmacy Emerald Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, A4_H);
    bgGrad.addColorStop(0, '#0c3b33');
    bgGrad.addColorStop(0.5, '#08695e');
    bgGrad.addColorStop(1, '#09342d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, A4_W, A4_H);

    // Subtle decorative background circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(A4_W / 2, 1850, 980, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(A4_W / 2, 1850, 1180, 0, Math.PI * 2);
    ctx.stroke();

    // Outer Gold/Mint Border Frame
    ctx.strokeStyle = 'rgba(234, 243, 228, 0.28)';
    ctx.lineWidth = 8;
    roundRectPath(ctx, 70, 70, A4_W - 140, A4_H - 140, 60);
    ctx.stroke();

    ctx.textAlign = 'center';

    // 2. Top Pill Badge
    ctx.fillStyle = '#eaf3e4';
    roundRectPath(ctx, 440, 150, A4_W - 880, 96, 48);
    ctx.fill();

    ctx.fillStyle = '#087f74';
    ctx.font = '800 38px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(topBadge.toUpperCase(), A4_W / 2, 212);

    // 3. Main Brand Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 132px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText(brandTitle.toUpperCase(), A4_W / 2, 395);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = '600 42px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(
      'Upload Prescription  •  Browse Catalog  •  Fast Doorstep Delivery',
      A4_W / 2,
      470,
    );

    // 4. White Offer Card Box
    const cardX = 160;
    const cardY = 555;
    const cardW = A4_W - 320;
    const cardH = 610;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, cardX, cardY, cardW, cardH, 55);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 14;
    roundRectPath(ctx, cardX, cardY, cardW, cardH, 55);
    ctx.stroke();

    // Offer Small Pill inside White Box
    ctx.fillStyle = '#fef08a';
    roundRectPath(ctx, A4_W / 2 - 360, cardY + 50, 720, 76, 38);
    ctx.fill();
    ctx.fillStyle = '#854d0e';
    ctx.font = '800 34px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(`★  ${offerBadge.toUpperCase()}  ★`, A4_W / 2, cardY + 100);

    // Main Big Offer Text
    ctx.fillStyle = '#087f74';
    ctx.font = '800 112px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText(mainOffer.toUpperCase(), A4_W / 2, cardY + 265, cardW - 120);

    // Sub Offer Text
    ctx.fillStyle = '#193c35';
    ctx.font = '700 52px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(subOffer, A4_W / 2, cardY + 365, cardW - 140);

    // Delivery Highlight Bar inside Offer Card
    ctx.fillStyle = '#104c42';
    roundRectPath(ctx, cardX + 120, cardY + 435, cardW - 240, 115, 30);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = '800 46px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(
      `🚚  ${deliveryHighlight}`,
      A4_W / 2,
      cardY + 508,
      cardW - 300,
    );

    // 5. Center Giant QR Code Frame
    const qrBoxSize = 1140;
    const qrBoxX = (A4_W - qrBoxSize) / 2;
    const qrBoxY = 1260;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 55;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 65);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 18;
    roundRectPath(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 65);
    ctx.stroke();

    // Draw QR Image inside Frame
    const qrPadding = 85;
    if (qrImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        qrImg,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2,
      );
    } else {
      ctx.fillStyle = '#687a70';
      ctx.font = '700 48px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText('Generating HD QR...', A4_W / 2, qrBoxY + qrBoxSize / 2);
    }

    // 6. Scan CTA Below QR
    ctx.fillStyle = '#fde047';
    ctx.font = '800 74px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText(`👆  ${scanCta.toUpperCase()}  👆`, A4_W / 2, 2525);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = '600 42px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(
      'Open Phone Camera, Google Lens, Paytm, or GPay to Scan',
      A4_W / 2,
      2600,
    );

    // 7. 3 Easy Steps Row
    const stepY = 2690;
    const stepW = 680;
    const stepH = 310;
    const gap = 60;
    const startX = (A4_W - (stepW * 3 + gap * 2)) / 2;

    const steps = [
      {
        num: '1',
        title: 'Scan QR Code',
        desc: 'Or visit goregaonmeds.com on your phone',
      },
      {
        num: '2',
        title: 'Select Medicines',
        desc: 'Upload prescription or add items to cart',
      },
      {
        num: '3',
        title: 'Fast Delivery',
        desc: 'Pay via Cash or UPI at your doorstep',
      },
    ];

    steps.forEach((st, idx) => {
      const sx = startX + idx * (stepW + gap);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      roundRectPath(ctx, sx, stepY, stepW, stepH, 36);
      ctx.fill();

      ctx.strokeStyle = 'rgba(167, 243, 208, 0.35)';
      ctx.lineWidth = 4;
      roundRectPath(ctx, sx, stepY, stepW, stepH, 36);
      ctx.stroke();

      // Step Number Circle
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(sx + stepW / 2, stepY + 75, 42, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0c3b33';
      ctx.font = '800 46px "Bricolage Grotesque", Arial, sans-serif';
      ctx.fillText(st.num, sx + stepW / 2, stepY + 91);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 44px "Bricolage Grotesque", Arial, sans-serif';
      ctx.fillText(st.title, sx + stepW / 2, stepY + 185);

      ctx.fillStyle = '#d1fae5';
      ctx.font = '500 32px "Plus Jakarta Sans", Arial, sans-serif';
      ctx.fillText(st.desc, sx + stepW / 2, stepY + 245, stepW - 50);
    });

    // 8. Footer Pharmacy Stores Banner
    const footY = 3090;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, 160, footY, A4_W - 320, 290, 42);
    ctx.fill();

    ctx.fillStyle = '#087f74';
    ctx.font = '800 36px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(
      'OUR TRUSTED LOCAL PHARMACIES IN GOREGAON MUMBAI',
      A4_W / 2,
      footY + 75,
    );

    ctx.fillStyle = '#193c35';
    ctx.font = '800 54px "Bricolage Grotesque", Arial, sans-serif';
    ctx.fillText(shopsLine, A4_W / 2, footY + 158, A4_W - 420);

    ctx.fillStyle = '#687a70';
    ctx.font = '600 34px "Plus Jakarta Sans", Arial, sans-serif';
    ctx.fillText(contactLine, A4_W / 2, footY + 232, A4_W - 420);
  }, [
    qrImg,
    topBadge,
    brandTitle,
    offerBadge,
    mainOffer,
    subOffer,
    deliveryHighlight,
    scanCta,
    shopsLine,
    contactLine,
  ]);

  useEffect(() => {
    renderPosterCanvas();
  }, [renderPosterCanvas]);

  // Download Ultra-HD 300-DPI PNG File (For WhatsApp Document Share)
  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    setDownloading(true);
    setTimeout(() => {
      try {
        const dataUrl = canvasRef.current!.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = 'GoregaonMeds-A4-Poster-300DPI.png';
        link.href = dataUrl;
        link.click();
      } finally {
        setDownloading(false);
      }
    }, 50);
  };

  // Open Exact A4 Print / Save-as-PDF Window
  const handlePrintOrSavePDF = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png', 1.0);
    const win = window.open('', '_blank');
    if (!win) {
      window.alert('Please allow popups to open the A4 PDF view.');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>GoregaonMeds-A4-Poster</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 210mm; height: 297mm; background: #fff; overflow: hidden; }
            img { width: 210mm; height: 297mm; object-fit: cover; display: block; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="setTimeout(() => { window.print(); }, 300);" />
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <>
      <PageHeading
        eyebrow="PRINT-READY A4 MARKETING STUDIO"
        title="Your A4 poster & QR code in one sheet."
      >
        Edit your offer below. Download the 300-DPI HD file and send it as a
        WhatsApp Document to your local print shop.
      </PageHeading>

      <div className="checkout-layout" style={{ alignItems: 'start' }}>
        {/* LEFT COLUMN: Poster Text & QR Controls */}
        <div className="panel">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <span className="eyebrow">
                <Sparkles size={13} /> CUSTOMIZE POSTER
              </span>
              <h2 style={{ marginTop: 6 }}>Poster details & QR link</h2>
            </div>
          </div>

          <label>
            QR Code Target Website Link
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://goregaonmeds.com"
            />
          </label>
          <p className="fine-print" style={{ marginTop: -8 }}>
            Jab koi customer poster scan karega toh seedha yeh link open hoga.
          </p>

          <div className="form-grid">
            <label>
              Top Header Badge
              <input
                type="text"
                value={topBadge}
                onChange={(e) => setTopBadge(e.target.value)}
              />
            </label>
            <label>
              Website / Brand Heading
              <input
                type="text"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Yellow Offer Tag
              <input
                type="text"
                value={offerBadge}
                onChange={(e) => setOfferBadge(e.target.value)}
              />
            </label>
            <label>
              Big Main Offer Headline
              <input
                type="text"
                value={mainOffer}
                onChange={(e) => setMainOffer(e.target.value)}
              />
            </label>
          </div>

          <label>
            Offer Subtitle
            <input
              type="text"
              value={subOffer}
              onChange={(e) => setSubOffer(e.target.value)}
            />
          </label>

          <label>
            Delivery Highlight Banner
            <input
              type="text"
              value={deliveryHighlight}
              onChange={(e) => setDeliveryHighlight(e.target.value)}
            />
          </label>

          <label>
            Scan Call-To-Action Text
            <input
              type="text"
              value={scanCta}
              onChange={(e) => setScanCta(e.target.value)}
            />
          </label>

          <label>
            Your Pharmacy Shop Names (Footer)
            <input
              type="text"
              value={shopsLine}
              onChange={(e) => setShopsLine(e.target.value)}
            />
          </label>

          <label>
            Bottom Trust Line
            <input
              type="text"
              value={contactLine}
              onChange={(e) => setContactLine(e.target.value)}
            />
          </label>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="btn full"
              style={{ margin: 0 }}
              disabled={downloading || qrLoading}
              onClick={handleDownloadPNG}
            >
              <Download size={18} />
              {downloading
                ? 'Preparing 300-DPI Poster…'
                : 'Download Ultra-HD Poster (For WhatsApp)'}
            </button>

            <button
              type="button"
              className="btn secondary full"
              style={{ margin: 0 }}
              disabled={qrLoading}
              onClick={handlePrintOrSavePDF}
            >
              <Printer size={18} />
              Save as Exact A4 PDF / Print Directly
            </button>
          </div>

          <div className="notice" style={{ marginTop: 20 }}>
            <strong>Print Shop Tip:</strong> Dukandar ko WhatsApp par bhejte
            waqt <strong>&ldquo;Document&rdquo;</strong> select karke bhejna
            taki full 300-DPI quality rahe. Unko bolna{' '}
            <strong>170 GSM Glossy Art Paper + Lamination</strong> par A4 print
            nikal dein.
          </div>
        </div>

        {/* RIGHT COLUMN: Live Scaled A4 Poster Preview */}
        <div className="panel summary" style={{ textAlign: 'center' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <span className="eyebrow">LIVE A4 SHEET PREVIEW</span>
            <small style={{ color: 'var(--muted)', fontWeight: 600 }}>
              210 × 297 mm (300 DPI)
            </small>
          </div>

          <div
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              border: '2px solid var(--border)',
              boxShadow: '0 20px 50px rgba(16, 76, 66, 0.16)',
              background: '#0c3b33',
            }}
          >
            <canvas
              ref={canvasRef}
              width={A4_W}
              height={A4_H}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function AdminOrders() {
  const [status, setStatus] = useState('Pending'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: ({ signal }) =>
      api<{ orders: Order[]; pagination: Pagination }>(
        `/admin/orders?status=${status}&page=${page}&limit=20`,
        { signal },
      ),
    refetchInterval: status === 'Pending' ? 30000 : false,
  });

  return (
    <>
      <PageHeading
        eyebrow="EVERY ORDER DESERVES ATTENTION"
        title="Orders, thoughtfully handled."
      />
      <div className="section-head">
        <div className="segmented">
          {['Pending', 'Delivered', 'Cancelled'].map((s) => (
            <button
              className={s === status ? 'active' : ''}
              key={s}
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn secondary small" onClick={() => q.refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.orders.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Bill</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {q.data.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.orderId}</strong>
                    </td>
                    <td>
                      {o.customerName}
                      <small>{o.mobileNumber}</small>
                    </td>
                    <td>{date(o.createdAt)}</td>
                    <td>
                      {o.billedAt ? money(o.finalAmount) : 'Bill pending'}
                    </td>
                    <td>
                      <Status status={o.status} />
                    </td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(o.id!)}
                      >
                        Review
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title={`No ${status.toLowerCase()} orders.`}>
          <p>Orders in this state will appear here.</p>
        </Empty>
      )}
      {selected && (
        <Modal title="Order workspace" onClose={() => setSelected(null)}>
          <OrderEditor id={selected} />
        </Modal>
      )}
    </>
  );
}

function OrderEditor({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: () => api<{ order: Order }>(`/admin/orders/${id}`),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  return q.isPending ? (
    <Loading />
  ) : q.error ? (
    <ErrorState error={q.error} retry={() => q.refetch()} />
  ) : q.data ? (
    <Bill
      key={`${id}-${q.data.order.billingVersion}-${q.data.order.status}`}
      order={q.data.order}
      reload={() => q.refetch()}
    />
  ) : null;
}

function Bill({ order: o, reload }: { order: Order; reload: () => void }) {
  const [medicines, setMedicines] = useState(
      o.medicines.map((i) => ({ ...i })),
    ),
    [products, setProducts] = useState(o.products.map((i) => ({ ...i }))),
    [discount, setDiscount] = useState(o.discount ?? 0),
    [reason, setReason] = useState(''),
    [conflict, setConflict] = useState(false);
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: async (action: string) => {
      if (action === 'billing')
        return send<{ order: Order }>(
          `/admin/orders/${o.id}/billing`,
          {
            billingVersion: o.billingVersion,
            discount,
            medicines: medicines.map(
              ({ _id, name, quantity, price, isAvailable }) => ({
                _id,
                name,
                quantity,
                price,
                isAvailable: isAvailable !== false,
              }),
            ),
            products: products.map(
              ({ _id, productId, name, quantity, price }) => ({
                _id,
                productId,
                name,
                quantity,
                price,
              }),
            ),
          },
          'PATCH',
        );
      if (action === 'cancel')
        return send<{ order: Order }>(
          `/admin/orders/${o.id}/cancel`,
          { cancelReason: reason.trim() },
          'PATCH',
        );
      return send<{ order: Order }>(
        `/admin/orders/${o.id}/deliver`,
        undefined,
        'PATCH',
      );
    },
    onSuccess: (data) => {
      qc.setQueryData(['admin', 'order', o.id], data);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) setConflict(true);
    },
  });

  const locked = m.isPending || o.status !== 'Pending' || conflict;

  function rows(lines: Line[], set: (v: Line[]) => void, isMedicine: boolean) {
    return lines.map((i, index) => (
      <div className="bill-row" key={i._id ?? index}>
        <span>{i.name}</span>
        <label>
          Qty
          <input
            type="number"
            required
            min="1"
            max="100"
            value={i.quantity}
            onChange={(e) =>
              set(
                lines.map((v, j) =>
                  j === index ? { ...v, quantity: Number(e.target.value) } : v,
                ),
              )
            }
          />
        </label>
        <label>
          Price ₹
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={i.price}
            onChange={(e) =>
              set(
                lines.map((v, j) =>
                  j === index ? { ...v, price: Number(e.target.value) } : v,
                ),
              )
            }
          />
        </label>
        {isMedicine ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={i.isAvailable !== false}
              onChange={(e) =>
                set(
                  lines.map((v, j) =>
                    j === index ? { ...v, isAvailable: e.target.checked } : v,
                  ),
                )
              }
            />
            Available
          </label>
        ) : (
          <button
            className="icon-button"
            type="button"
            aria-label={`Remove ${i.name}`}
            onClick={() => set(lines.filter((_, j) => j !== index))}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    ));
  }

  return (
    <>
      <div className="section-head">
        <h3>{o.orderId}</h3>
        <Status status={o.status} />
      </div>
      <p>
        {o.customerName} · {o.mobileNumber}
      </p>
      <p>
        {o.address?.flat}, {o.address?.area}, {o.address?.landmark}
      </p>
      {o.prescriptionUrl && (
        <p className="notice">
          Prescription attached. Secure preview is pending an authorized backend
          preview endpoint.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate('billing');
        }}
      >
        <fieldset disabled={locked}>
          <h3>Billing lines</h3>
          {rows(medicines, setMedicines, true)}
          {rows(products, setProducts, false)}
          <label>
            Discount (₹)
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </label>
          <p className="fine-print">
            Version {o.billingVersion}. Totals, stock adjustments, and offers
            are calculated by the backend.
          </p>
          <button className="btn">
            <Save size={17} />
            Save bill
          </button>
        </fieldset>
      </form>
      <div className="summary-total">
        <span>{o.billedAt ? 'Saved final bill' : 'Awaiting billing'}</span>
        <strong>{o.billedAt ? money(o.finalAmount) : '—'}</strong>
      </div>
      {m.error && <ErrorState error={m.error} />}{' '}
      {conflict && (
        <div className="notice">
          This order changed or the operation conflicted. Your draft has been
          kept.{' '}
          <button
            className="text-link"
            onClick={() => {
              if (
                window.confirm('Discard this draft and load the latest order?')
              ) {
                setConflict(false);
                reload();
              }
            }}
          >
            Discard draft & reload latest
          </button>
        </div>
      )}
      {o.status === 'Pending' && (
        <>
          <button
            className="btn full"
            disabled={locked || !o.billedAt}
            onClick={() => {
              if (window.confirm('Confirm this order has been delivered?'))
                m.mutate('deliver');
            }}
          >
            Mark delivered
          </button>
          <label>
            Cancellation reason
            <input
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={locked}
            />
          </label>
          <button
            className="btn danger"
            disabled={locked || !reason.trim()}
            onClick={() => {
              if (
                window.confirm('Cancel this order and restore eligible stock?')
              )
                m.mutate('cancel');
            }}
          >
            Cancel order
          </button>
        </>
      )}
    </>
  );
}

// ============================================================================
// ADMIN PRODUCTS LIST WITH INSTANT OPTIMISTIC UI FOR TRENDING TOGGLE
// ============================================================================
function AdminProducts() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [edit, setEdit] = useState<Product | true | null>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['admin', 'products', page, query],
    queryFn: () =>
      api<{ products: Product[]; categories?: string[]; pagination?: Pagination }>(
        `/admin/products?page=${page}&limit=20&q=${encodeURIComponent(query)}`,
      ),
  });

  const settingsQuery = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<{ settings: Settings }>('/admin/settings'),
  });

  const trendingIds = settingsQuery.data?.settings.trendingProducts ?? [];
  const trendingLimit = settingsQuery.data?.settings.trendingLimit ?? 4;

  // Optimistic UI Mutation (Instagram Like/Unlike style instant response)
  const toggleTrending = useMutation({
    mutationFn: (nextTrending: string[]) =>
      send<{ settings: Settings }>(
        '/admin/settings',
        { trendingProducts: nextTrending },
        'PATCH',
      ),
    onMutate: async (nextTrending) => {
      await qc.cancelQueries({ queryKey: ['admin', 'settings'] });
      const previous = qc.getQueryData<{ settings: Settings }>([
        'admin',
        'settings',
      ]);

      qc.setQueryData<{ settings: Settings }>(['admin', 'settings'], (old) =>
        old
          ? {
              ...old,
              settings: { ...old.settings, trendingProducts: nextTrending },
            }
          : old,
      );

      return { previous };
    },
    onError: (_err, _nextTrending, context) => {
      if (context?.previous) {
        qc.setQueryData(['admin', 'settings'], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'trending'] });
    },
  });

  const del = useMutation({
    mutationFn: (id: string) =>
      send(`/admin/products/${id}`, undefined, 'DELETE'),
    onSuccess: (_data, deletedId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      const currentIds =
        qc.getQueryData<{ settings: Settings }>(['admin', 'settings'])?.settings
          .trendingProducts ?? trendingIds;
      if (currentIds.includes(deletedId)) {
        toggleTrending.mutate(currentIds.filter((id) => id !== deletedId));
      }
    },
  });

  const handleToggleTrending = (id: string) => {
    const currentIds =
      qc.getQueryData<{ settings: Settings }>(['admin', 'settings'])?.settings
        .trendingProducts ?? trendingIds;

    const isTrending = currentIds.includes(id);
    if (!isTrending && currentIds.length >= 20) {
      window.alert('You can select up to 20 trending products.');
      return;
    }
    const next = isTrending
      ? currentIds.filter((item) => item !== id)
      : [...currentIds, id];
    toggleTrending.mutate(next);
  };

  return (
    <>
      <PageHeading title="A well-kept shelf." eyebrow="CATALOG & INVENTORY" />
      <div className="section-head">
        <form
          className="search-field"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
            setPage(1);
          }}
        >
          <Search size={18} />
          <input
            placeholder="Search products"
            aria-label="Search products"
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="text-link">Search</button>
        </form>
        <button className="btn" onClick={() => setEdit(true)}>
          <Plus size={17} />
          Add product
        </button>
      </div>
      <p className="fine-print">
        Trending selected: <strong>{trendingIds.length}</strong> / 20 · Showing
        up to <strong>{trendingLimit}</strong> on homepage (change limit in
        Settings).
      </p>
      {del.error && <ErrorState error={del.error} />}{' '}
      {toggleTrending.error && <ErrorState error={toggleTrending.error} />}{' '}
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.products.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Homepage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {q.data.products.map((p) => {
                  const id = productId(p);
                  const isTrending = trendingIds.includes(id);
                  return (
                    <tr key={id}>
                      <td
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 36,
                            borderRadius: 6,
                            background: '#f5f7f1',
                            display: 'grid',
                            placeItems: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid var(--border)',
                          }}
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                mixBlendMode: 'multiply',
                              }}
                            />
                          ) : (
                            <Pill size={18} color="#a2b49b" />
                          )}
                        </div>
                        <div>
                          <strong>{p.name}</strong>
                          <small>{p.isActive ? 'Active' : 'Hidden'}</small>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        {p.trackStock
                          ? `${p.stockQuantity} units`
                          : p.inStock
                            ? 'Available'
                            : 'Unavailable'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn small ${isTrending ? '' : 'secondary'}`}
                          disabled={settingsQuery.isPending}
                          onClick={() => handleToggleTrending(id)}
                        >
                          {isTrending ? '★ Trending' : '+ Add to trending'}
                        </button>
                      </td>
                      <td>
                        <button
                          className="text-link"
                          onClick={() => setEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${p.name}`}
                          disabled={del.isPending}
                          onClick={() => {
                            if (window.confirm(`Permanently delete ${p.name}?`))
                              del.mutate(id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination?.totalPages ?? page}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title="Your catalog starts here.">
          <p>Add a product to put it on your shelf.</p>
        </Empty>
      )}
      {edit && (
        <Modal
          title={edit === true ? 'Add a product' : 'Edit product'}
          onClose={() => setEdit(null)}
        >
          <ProductForm
            product={edit === true ? undefined : edit}
            categories={q.data?.categories ?? []}
            done={() => setEdit(null)}
          />
        </Modal>
      )}
    </>
  );
}

// ============================================================================
// LIVE 4:3 (600x450px) CLIENT-SIDE IMAGE CROPPER MODAL
// ============================================================================
const CROP_VIEW_W = 320;
const CROP_VIEW_H = 240; // Exact 4:3 ratio
const OUTPUT_W = 600;
const OUTPUT_H = 450;

function ImageCropModal({
  src,
  onCancel,
  onConfirm,
  uploading,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  uploading: boolean;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Fit inside 4:3 frame nicely
  const baseScale = Math.max(
    CROP_VIEW_W / naturalSize.w,
    CROP_VIEW_H / naturalSize.h,
  );
  const currentScale = baseScale * zoom;
  const dispW = naturalSize.w * currentScale;
  const dispH = naturalSize.h * currentScale;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleCropAndUpload = () => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_W;
    canvas.height = OUTPUT_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clean white background (matches mix-blend-mode: multiply on ProductCard)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_W, OUTPUT_H);

    const ratio = OUTPUT_W / CROP_VIEW_W;
    const drawX = ((CROP_VIEW_W - dispW) / 2 + offset.x) * ratio;
    const drawY = ((CROP_VIEW_H - dispH) / 2 + offset.y) * ratio;
    const drawW = dispW * ratio;
    const drawH = dispH * ratio;

    ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      'image/webp',
      0.9,
    );
  };

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 16,
        background: '#f5f7f1',
        padding: 18,
        margin: '16px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <strong
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
          }}
        >
          <Crop size={16} color="var(--teal)" />
          Crop Product Photo (4:3 · 600×450px)
        </strong>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          disabled={uploading}
          style={{ minWidth: 32, minHeight: 32 }}
        >
          <X size={16} />
        </button>
      </div>

      <p className="fine-print" style={{ marginTop: 0, marginBottom: 12 }}>
        Drag photo to position it inside the 4:3 frame. Zoom in or out to fit
        your product neatly.
      </p>

      {/* Interactive 4:3 Crop Viewport */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          width: CROP_VIEW_W,
          height: CROP_VIEW_H,
          maxWidth: '100%',
          margin: '0 auto',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
          borderRadius: 12,
          border: '2px dashed var(--teal)',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Crop source"
          draggable={false}
          onLoad={(e) => {
            setNaturalSize({
              w: e.currentTarget.naturalWidth || 1,
              h: e.currentTarget.naturalHeight || 1,
            });
            setOffset({ x: 0, y: 0 });
            setZoom(1);
          }}
          style={{
            position: 'absolute',
            left: (CROP_VIEW_W - dispW) / 2 + offset.x,
            top: (CROP_VIEW_H - dispH) / 2 + offset.y,
            width: dispW,
            height: dispH,
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
        />
        {/* Subtle 4:3 Rule-of-Thirds Grid Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(to right, rgba(8,127,116,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(8,127,116,0.12) 1px, transparent 1px)',
            backgroundSize: '33.33% 33.33%',
          }}
        />
      </div>

      {/* Zoom Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: CROP_VIEW_W,
          margin: '14px auto',
        }}
      >
        <ZoomOut size={16} color="var(--muted)" />
        <input
          type="range"
          min="0.4"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ minHeight: 'auto', padding: 0, accentColor: 'var(--teal)' }}
        />
        <ZoomIn size={16} color="var(--muted)" />
        <button
          type="button"
          className="text-link"
          style={{ minHeight: 'auto', padding: '0 4px', fontSize: 11 }}
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn secondary small"
          onClick={onCancel}
          disabled={uploading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn small"
          onClick={handleCropAndUpload}
          disabled={uploading}
        >
          <Check size={15} />
          {uploading ? 'Uploading to Cloudinary…' : 'Crop & Upload'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PRODUCT FORM WITH GALLERY / CAMERA UPLOAD & LIVE PRODUCT CARD PREVIEW
// ============================================================================
function formatCategoryName(val: string) {
  return val
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function ProductForm({
  product: p,
  categories = [],
  done,
}: {
  product?: Product;
  categories?: string[];
  done: () => void;
}) {
  const qc = useQueryClient();

  // Controlled states for live ProductCard preview
  const [name, setName] = useState(p?.name ?? '');
  const [category, setCategory] = useState(p?.category ?? '');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [price, setPrice] = useState(p?.price ?? 0);
  const [imageUrl, setImageUrl] = useState(p?.imageUrl ?? '');
  const [inStock, setInStock] = useState(p?.inStock ?? true);
  const [trackStock, setTrackStock] = useState(p?.trackStock ?? false);
  const [stockQuantity, setStockQuantity] = useState(p?.stockQuantity ?? 0);

  // Image Cropper & Upload states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const categoryList = Array.from(
    new Set([...categories, ...(p?.category ? [formatCategoryName(p.category)] : [])]),
  ).sort((a, b) => a.localeCompare(b));

  const showNewCategoryInput = isAddingNewCategory || categoryList.length === 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input so same file can be re-selected
  };

  const handleUploadCroppedBlob = async (blob: Blob) => {
    try {
      setUploadingImage(true);
      setUploadError(null);

      // 1. Get Public Upload signature from Backend (/admin/uploads/product-signature)
      const sigRes = await api<{
        upload: {
          cloudName: string;
          apiKey: string;
          folder: string;
          timestamp: number;
          type: string;
          signature: string;
          uploadUrl: string;
        };
      }>('/admin/uploads/product-signature');

      const { apiKey, folder, timestamp, type, signature, uploadUrl } =
        sigRes.upload;

      // 2. Upload cropped 600x450 WebP image to Cloudinary Public folder (goregaonmeds/products)
      const formData = new FormData();
      formData.append('file', blob, `product-${Date.now()}.webp`);
      formData.append('api_key', apiKey);
      formData.append('folder', folder);
      formData.append('timestamp', String(timestamp));
      formData.append('type', type);
      formData.append('signature', signature);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.secure_url) {
        throw new Error(
          uploadData?.error?.message || 'Cloudinary image upload failed.',
        );
      }

      // 3. Automatically populate imageUrl & close cropper
      setImageUrl(uploadData.secure_url);
      setRawImageSrc(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to upload product image.',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const m = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      send(
        p ? `/admin/products/${productId(p)}` : '/admin/products',
        body,
        p ? 'PUT' : 'POST',
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      done();
    },
  });

  const previewAvailable =
    inStock && (!trackStock || Number(stockQuantity) > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        m.mutate({
          name: name.trim(),
          category: formatCategoryName(category),
          description: f.get('description'),
          price: Number(price),
          imageUrl: imageUrl.trim(),
          kind: f.get('kind'),
          stockQuantity: Number(stockQuantity),
          isActive: f.has('isActive'),
          inStock,
          trackStock,
        });
      }}
    >
      <fieldset disabled={m.isPending || uploadingImage}>
        <div className="form-grid">
          <label>
            Product name
            <input
              name="name"
              required
              type="text"
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Category
            {!showNewCategoryInput ? (
              <select
                name="categorySelect"
                required
                value={
                  categoryList.find(
                    (c) => c.toLowerCase() === category.trim().toLowerCase(),
                  ) ?? ''
                }
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsAddingNewCategory(true);
                    setCategory('');
                  } else {
                    setCategory(e.target.value);
                  }
                }}
              >
                <option value="" disabled>
                  Select category…
                </option>
                {categoryList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__NEW__">+ Add new category…</option>
              </select>
            ) : (
              <>
                <input
                  name="category"
                  required
                  type="text"
                  minLength={2}
                  maxLength={60}
                  placeholder="e.g. Face Wash, Baby Care"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onBlur={() => {
                    if (category.trim()) setCategory(formatCategoryName(category));
                  }}
                  autoFocus
                />
                {categoryList.length > 0 && (
                  <button
                    type="button"
                    className="text-link"
                    style={{ minHeight: 'auto', padding: 0, fontSize: 11 }}
                    onClick={() => {
                      setIsAddingNewCategory(false);
                      setCategory(p?.category || categoryList[0] || '');
                    }}
                  >
                    ← Select from existing categories
                  </button>
                )}
              </>
            )}
          </label>
          <label>
            Price (₹)
            <input
              name="price"
              required
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label>
            Stock quantity
            <input
              name="stockQuantity"
              required
              type="number"
              min={0}
              step="1"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(Number(e.target.value))}
            />
          </label>
        </div>

        <label>
          Description
          <textarea
            name="description"
            maxLength={500}
            defaultValue={p?.description}
          />
        </label>

        {/* Product Image Upload Section (Gallery + Camera + Cropper + Preview) */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 16,
            background: '#fafbf8',
            margin: '16px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div>
              <strong style={{ fontSize: 13, display: 'block' }}>
                Product Catalog Image (4:3 · 600×450px)
              </strong>
              <span className="fine-print" style={{ margin: 0 }}>
                Select from Gallery or take a live photo via Mobile Camera.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Hidden File Inputs */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                className="btn secondary small"
                onClick={() => galleryInputRef.current?.click()}
              >
                <ImageIcon size={15} />
                Gallery
              </button>
              <button
                type="button"
                className="btn secondary small"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={15} />
                Camera
              </button>
            </div>
          </div>

          {/* Live 4:3 Cropper Modal when a file is chosen */}
          {rawImageSrc && (
            <ImageCropModal
              src={rawImageSrc}
              uploading={uploadingImage}
              onCancel={() => setRawImageSrc(null)}
              onConfirm={handleUploadCroppedBlob}
            />
          )}

          {uploadError && (
            <p className="field-error" role="alert">
              {uploadError}
            </p>
          )}

          <label style={{ marginTop: 12, marginBottom: 8 }}>
            Public product image URL
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                name="imageUrl"
                type="url"
                placeholder="https://res.cloudinary.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              {imageUrl && (
                <button
                  type="button"
                  className="btn secondary small"
                  onClick={() => setImageUrl('')}
                  title="Clear image"
                >
                  Clear
                </button>
              )}
            </div>
          </label>

          {/* Live Storefront ProductCard Preview */}
          <div style={{ marginTop: 14 }}>
            <span
              className="eyebrow"
              style={{ fontSize: 9, marginBottom: 8, display: 'block' }}
            >
              LIVE STOREFRONT CARD PREVIEW
            </span>
            <div style={{ maxWidth: 230 }}>
              <article className="product-card" style={{ margin: 0 }}>
                <div className="product-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={name || 'Product preview'} />
                  ) : (
                    <Pill size={44} />
                  )}
                </div>
                <span className="product-category">
                  {formatCategoryName(category) || 'CATEGORY'}
                </span>
                <div className="product-title">
                  {name || 'Product Name'}
                </div>
                <small>
                  {previewAvailable
                    ? 'Available to order'
                    : 'Currently unavailable'}
                </small>
                <div className="product-bottom">
                  <strong>{money(Number(price) || 0)}</strong>
                  <span className="add-btn" style={{ pointerEvents: 'none' }}>
                    <Plus size={16} />
                    Add
                  </span>
                </div>
              </article>
            </div>
          </div>
        </div>

        <label>
          Product classification
          <select name="kind" defaultValue={p?.kind ?? 'non_medicine'}>
            <option value="non_medicine">Non-medicine</option>
            <option value="medicine">Medicine</option>
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={p?.isActive ?? true}
          />
          Visible in catalog
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="inStock"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
          />
          Available to order
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="trackStock"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
          />
          Track stock quantity
        </label>

        {m.error && <ErrorState error={m.error} />}
        <button className="btn full" disabled={uploadingImage || m.isPending}>
          {m.isPending ? 'Saving…' : 'Save product'}
        </button>
      </fieldset>
    </form>
  );
}

function Customers() {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [qtext, setQtext] = useState('');

  const q = useQuery({
    queryKey: ['admin', 'customers', page, qtext],
    queryFn: () =>
      api<{
        customers: {
          id?: string;
          email: string;
          fullName: string;
          totalOrders: number;
          deliveredOrders: number;
        }[];
        pagination: Pagination;
      }>(
        `/admin/customers?page=${page}&limit=20&q=${encodeURIComponent(qtext)}`,
      ),
  });

  return (
    <>
      <PageHeading
        title="The people behind every order."
        eyebrow="YOUR CUSTOMERS"
      />
      <form
        className="search-field"
        onSubmit={(e) => {
          e.preventDefault();
          setQtext(search);
          setPage(1);
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search customers"
          placeholder="Search by name or email"
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="text-link">Search</button>
      </form>
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.customers.length ? (
        <>
          <div className="table-wrap panel">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Total orders</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {q.data.customers.map((c) => (
                  <tr key={c.id ?? c.email}>
                    <td>{c.fullName || 'Name not provided'}</td>
                    <td>{c.email}</td>
                    <td>{c.totalOrders}</td>
                    <td>{c.deliveredOrders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            total={q.data.pagination.totalPages}
            onChange={setPage}
          />
        </>
      ) : (
        <Empty title="No customers found." />
      )}
    </>
  );
}

function AdminSettings() {
  const q = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api<{ settings: Settings }>('/admin/settings'),
    refetchOnWindowFocus: false,
  });
  return (
    <>
      <PageHeading
        title="The details that make a difference."
        eyebrow="PHARMACY SETTINGS"
      />
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : (
        q.data && <SettingsForm settings={q.data.settings} />
      )}
    </>
  );
}

function SettingsForm({ settings: s }: { settings: Settings }) {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const m = useMutation({
    mutationFn: (body: unknown) => send('/admin/settings', body, 'PATCH'),
    onSuccess: () => {
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['admin', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'settings'] });
      qc.invalidateQueries({ queryKey: ['public', 'trending'] });
    },
  });
  return (
    <form
      className="panel settings-form"
      onChange={() => setSaved(false)}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        m.mutate({
          deliveryCharge: Number(f.get('deliveryCharge')),
          firstOrderMinimumMedicineAmount: Number(
            f.get('firstOrderMinimumMedicineAmount'),
          ),
          lowStockThreshold: Number(f.get('lowStockThreshold')),
          trendingLimit: Number(f.get('trendingLimit')),
          firstOrderOfferEnabled: f.has('firstOrderOfferEnabled'),
        });
      }}
    >
      <fieldset disabled={m.isPending}>
        <h2>Delivery & offers</h2>
        <label>
          Delivery charge (₹)
          <input
            type="number"
            name="deliveryCharge"
            min="0"
            max="2000"
            step="0.01"
            required
            defaultValue={s.deliveryCharge}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            name="firstOrderOfferEnabled"
            defaultChecked={s.firstOrderOfferEnabled}
          />
          Enable first-order gift offer
        </label>
        <label>
          Minimum medicine subtotal for gift (₹)
          <input
            type="number"
            name="firstOrderMinimumMedicineAmount"
            min="0"
            max="1000000"
            step="0.01"
            required
            defaultValue={s.firstOrderMinimumMedicineAmount}
          />
        </label>
        <p className="fine-print">
          Only medicine subtotal counts. Non-medicine products and delivery are
          excluded.
        </p>
        <label>
          Low-stock alert threshold
          <input
            type="number"
            name="lowStockThreshold"
            min="0"
            step="1"
            required
            defaultValue={s.lowStockThreshold ?? 0}
          />
        </label>
        <label>
          Homepage trending products limit (1–20)
          <input
            type="number"
            name="trendingLimit"
            min="1"
            max="20"
            step="1"
            required
            defaultValue={s.trendingLimit ?? 4}
          />
        </label>
        <p className="fine-print">
          Controls how many selected trending products appear on the homepage.
        </p>
        {m.error && <ErrorState error={m.error} />}{' '}
        {saved && (
          <p role="status" className="success-text">
            Settings saved.
          </p>
        )}
        <button className="btn">
          <Save size={17} />
          {m.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </fieldset>
    </form>
  );
}

function Logs() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: () =>
      api<{
        logs: {
          _id: string;
          type: string;
          message: string;
          createdAt: string;
        }[];
      }>('/admin/logs'),
  });

  const m = useMutation({
    mutationFn: (id: string) =>
      send(`/admin/logs${id === 'all' ? '' : `/${id}`}`, undefined, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'logs'] }),
  });

  return (
    <>
      <PageHeading
        title="Keep an eye on the essentials."
        eyebrow="SYSTEM LOGS"
      />
      <div className="section-head">
        <p>Newest 100 events · Raw error context is not displayed.</p>
        <button
          className="btn danger small"
          disabled={m.isPending || !q.data?.logs.length}
          onClick={() => {
            if (window.confirm('Permanently clear all system logs?'))
              m.mutate('all');
          }}
        >
          Clear all logs
        </button>
      </div>
      {m.error && <ErrorState error={m.error} />}{' '}
      {q.isPending ? (
        <TableSkeleton rows={5} />
      ) : q.error ? (
        <ErrorState error={q.error} retry={() => q.refetch()} />
      ) : q.data?.logs.length ? (
        <div className="panel">
          {q.data.logs.map((l) => (
            <div className="saved-row" key={l._id}>
              <Activity size={19} />
              <div>
                <strong>
                  {l.type === 'inventory_alert'
                    ? 'Inventory alert'
                    : 'System event'}
                </strong>
                <p>{date(l.createdAt)}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Delete log"
                disabled={m.isPending}
                onClick={() => {
                  if (window.confirm('Delete this event?')) m.mutate(l._id);
                }}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No system events to show." />
      )}
    </>
  );
}