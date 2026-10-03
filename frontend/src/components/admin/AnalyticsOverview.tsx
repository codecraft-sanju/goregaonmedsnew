'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar, ShoppingBag, TrendingUp, Filter, Loader2 } from 'lucide-react';
import { adminRequest } from '@/lib/adminApi';
import { formatRupees } from '@/lib/format';

interface AnalyticsData {
  totalSales: number;
  totalOrders: number;
  breakdown: {
    pending: number;
    delivered: number;
  };
}

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date selection states
  const [dateRangeType, setDateRangeType] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate actual Date objects based on selection
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (dateRangeType === 'today') {
      return { startDate: today, endDate: today };
    }
    if (dateRangeType === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: yesterday };
    }
    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      return {
        startDate: new Date(customStartDate),
        endDate: new Date(customEndDate),
      };
    }
    // Fallback if custom dates are incomplete
    return { startDate: today, endDate: today };
  }, [dateRangeType, customStartDate, customEndDate]);

  // Fetch data whenever the computed dates change
  useEffect(() => {
    if (dateRangeType === 'custom' && (!customStartDate || !customEndDate)) {
      return; // Wait until both dates are selected
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const startString = startDate.toISOString().split('T')[0];
        const endString = endDate.toISOString().split('T')[0];
        
        const response = await adminRequest<{ success: boolean; totalSales: number; totalOrders: number; breakdown: { pending: number; delivered: number } }>(
          `/analytics/overview?startDate=${startString}&endDate=${endString}`
        );
        
        if (response.success) {
           setData({
             totalSales: response.totalSales,
             totalOrders: response.totalOrders,
             breakdown: response.breakdown
           });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [startDate, endDate, dateRangeType, customStartDate, customEndDate]);

  return (
    <div className="space-y-6 mb-8">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Sales & Analytics</h2>
          <p className="mt-1 text-sm text-ink-muted">Track revenue and order volume.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            className="h-10 rounded-xl bg-white px-3 text-sm font-medium ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
            value={dateRangeType}
            onChange={(e) => setDateRangeType(e.target.value as any)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {dateRangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
              />
              <span className="text-ink-soft">to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-10 rounded-xl bg-white px-3 text-sm ring-1 ring-brand-100 outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Metrics Display */}
      {error && (
         <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
           {error}
         </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-28 rounded-2xl bg-brand-50/50 animate-pulse border border-brand-100" />
          <div className="h-28 rounded-2xl bg-brand-50/50 animate-pulse border border-brand-100" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Revenue Card */}
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              Total Sales
            </div>
            <div className="mt-2 text-3xl font-display font-bold text-brand-900">
              {formatRupees(data?.totalSales ?? 0)}
            </div>
            <p className="mt-1 text-xs text-ink-muted">From delivered orders only</p>
          </div>

          {/* Orders Card */}
          <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-soft">
              <ShoppingBag className="h-4 w-4 text-brand-600" />
              Total Orders
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-3xl font-display font-bold text-brand-900">{data?.totalOrders ?? 0}</span>
              <div className="flex gap-2 text-xs font-medium">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 ring-1 ring-inset ring-amber-200">
                  {data?.breakdown.pending ?? 0} Pending
                </span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-800 ring-1 ring-inset ring-brand-200">
                  {data?.breakdown.delivered ?? 0} Delivered
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}