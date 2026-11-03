//src/components/ui.tsx
'use client';
import {
  AlertCircle,
  RefreshCw,
  PackageOpen,
  LoaderCircle,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">{eyebrow ?? 'YOUR NEIGHBOURHOOD PHARMACY'}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Empty({
  title,
  children,
  icon: Icon = PackageOpen,
}: {
  title: string;
  children?: React.ReactNode;
  icon?: typeof PackageOpen;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={28} />
      </div>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>Let’s try that again</strong>
        <p>
          {error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.'}
        </p>
      </div>
      {retry && (
        <button className="btn secondary small" onClick={retry}>
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} />
      Getting things ready…
    </div>
  );
}

export function Skeleton({
  count = 4,
  className = 'product-grid',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-label="Loading products" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="checkout-layout" aria-label="Loading your care bag" aria-busy="true">
      <section className="panel">
        {[1, 2, 3].map((i) => (
          <div className="cart-row" key={i}>
            <div className="skeleton" style={{ width: 62, height: 65, borderRadius: 10, flexShrink: 0 }} />
            <div className="cart-info">
              <div className="skeleton" style={{ width: '55%', height: 18, borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '30%', height: 13, borderRadius: 6 }} />
            </div>
            <div className="skeleton" style={{ width: 96, height: 44, borderRadius: 8 }} />
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
        ))}
      </section>
      <aside className="panel summary">
        <div className="skeleton" style={{ width: '35%', height: 10, borderRadius: 4, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: '65%', height: 26, borderRadius: 6, marginBottom: 25 }} />
        {[1, 2, 3].map((i) => (
          <div className="price-row" key={i}>
            <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 4 }} />
            <div className="skeleton" style={{ width: '25%', height: 14, borderRadius: 4 }} />
          </div>
        ))}
        <div className="summary-total">
          <div className="skeleton" style={{ width: '45%', height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '32%', height: 24, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 9, marginTop: 16 }} />
      </aside>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="checkout-layout" aria-label="Loading checkout" aria-busy="true">
      <div>
        <div className="panel">
          <div className="skeleton" style={{ width: '45%', height: 26, borderRadius: 6, marginBottom: 22 }} />
          <div className="skeleton" style={{ width: 240, height: 48, borderRadius: 10, marginBottom: 20 }} />
          <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10, marginBottom: 12 }} />
          <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10 }} />
        </div>
        <div className="panel">
          <div className="skeleton" style={{ width: '50%', height: 26, borderRadius: 6, marginBottom: 22 }} />
          <div className="form-grid">
            <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10 }} />
            <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10 }} />
          </div>
          <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10, marginTop: 18 }} />
          <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 10, marginTop: 18 }} />
        </div>
      </div>
      <aside className="panel summary">
        <div className="skeleton" style={{ width: '40%', height: 10, borderRadius: 4, marginBottom: 14 }} />
        <div className="skeleton" style={{ width: '65%', height: 26, borderRadius: 6, marginBottom: 22 }} />
        <div className="skeleton" style={{ width: '100%', height: 68, borderRadius: 13, marginBottom: 18 }} />
        <div className="skeleton" style={{ width: '100%', height: 42, borderRadius: 6, marginBottom: 18 }} />
        <div className="skeleton" style={{ width: '100%', height: 46, borderRadius: 9 }} />
      </aside>
    </div>
  );
}

export function OrdersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-label="Loading orders" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="panel order-card" key={i}>
          <div className="skeleton" style={{ width: 57, height: 57, borderRadius: 17, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '40%', height: 18, borderRadius: 6, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '60%', height: 13, borderRadius: 4 }} />
          </div>
          <div className="skeleton" style={{ width: 78, height: 24, borderRadius: 20 }} />
          <div className="skeleton" style={{ width: 70, height: 18, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="panel order-detail" aria-label="Loading order details" aria-busy="true">
      <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 22 }} />
      <div className="section-head">
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '45%', height: 28, borderRadius: 6, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: '30%', height: 14, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 88, height: 26, borderRadius: 20 }} />
      </div>
      <div className="skeleton" style={{ width: '100%', height: 84, borderRadius: 12, margin: '24px 0' }} />
      {[1, 2, 3].map((i) => (
        <div className="order-line" key={i}>
          <div className="skeleton" style={{ width: '50%', height: 16, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '20%', height: 16, borderRadius: 4 }} />
        </div>
      ))}
      <div className="summary-total">
        <div className="skeleton" style={{ width: '35%', height: 18, borderRadius: 4 }} />
        <div className="skeleton" style={{ width: '28%', height: 26, borderRadius: 6 }} />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="profile-grid" aria-label="Loading profile" aria-busy="true">
      <aside className="panel profile-card">
        <div className="skeleton" style={{ width: 65, height: 65, borderRadius: '50%', marginBottom: 20 }} />
        <div className="skeleton" style={{ width: '60%', height: 24, borderRadius: 6, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 24 }} />
        {[1, 2, 3].map((i) => (
          <div className="skeleton" key={i} style={{ width: '100%', height: 48, borderRadius: 6, marginBottom: 8 }} />
        ))}
      </aside>
      <section className="panel">
        <div className="skeleton" style={{ width: '55%', height: 26, borderRadius: 6, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '85%', height: 14, borderRadius: 4, marginBottom: 28 }} />
        {[1, 2, 3].map((i) => (
          <div className="saved-row" key={i}>
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '45%', height: 16, borderRadius: 4, marginBottom: 8 }} />
              <div className="skeleton" style={{ width: '70%', height: 13, borderRadius: 4 }} />
            </div>
            <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
        ))}
      </section>
    </div>
  );
}

export function NotificationsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="panel" aria-label="Loading notifications" aria-busy="true">
      <div className="section-head">
        <div className="skeleton" style={{ width: 180, height: 26, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 120, height: 38, borderRadius: 8 }} />
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div className="notification" key={i}>
          <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: '45%', height: 17, borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '25%', height: 11, borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </section>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="panel table-wrap" aria-label="Loading table data" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 16,
            padding: '16px 0',
            borderBottom: i < rows - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div className="skeleton" style={{ width: '22%', height: 16, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: '33%', height: 16, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: '20%', height: 16, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: '15%', height: 16, borderRadius: 6, marginLeft: 'auto' }} />
        </div>
      ))}
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="metric-grid" aria-label="Loading metrics" aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div className="panel metric" key={i}>
          <div className="skeleton" style={{ width: '45%', height: 10, borderRadius: 4 }} />
          <div className="skeleton" style={{ width: '60%', height: 36, borderRadius: 8, margin: '20px 0 8px' }} />
          <div className="skeleton" style={{ width: '80%', height: 12, borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current,
      old = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => {
      d?.close();
      old?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="pager">
      <button
        className="btn secondary small"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {Math.max(1, total)}
      </span>
      <button
        className="btn secondary small"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function Status({ status }: { status: string }) {
  return (
    <span className={`status ${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}