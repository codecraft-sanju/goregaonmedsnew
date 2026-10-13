// src/components/profile/UserProfile.tsx
'use client';

import { useEffect, useState } from 'react'; 
import Link from 'next/link';
import { 
  User, MapPin, PackageSearch, HelpCircle, Shield, 
  FileText, Phone, Trash2, ChevronRight, CheckCircle2, Plus, Edit2, Map
} from 'lucide-react';
import { loadCheckout, clearCheckout, saveCheckout, type SavedCheckout } from '@/lib/checkoutStorage';
import { SUPPORT_PHONE_TEL, SUPPORT_PHONE_DISPLAY } from '@/lib/constants';
import { formatMobile, normalizeMobile } from '@/lib/format';
import { DeliveryDetailsForm, type DeliveryDetails } from '@/components/order/OrderFlow';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// Simple validation function extracted for profile use
function validateDetails(details: DeliveryDetails) {
  const errors: Partial<Record<string, string>> = {};
  if (details.customerName.trim().length < 2) errors.customerName = 'Enter your full name';
  if (!normalizeMobile(details.mobileNumber)) errors.mobileNumber = 'Enter a valid 10-digit mobile number';
  if (!details.address.flat.trim()) errors.flat = 'Enter your flat, house or building';
  if (details.address.area.trim().length < 2) errors.area = 'Enter your area';
  return errors;
}

const emptyDetails: DeliveryDetails = { customerName: '', mobileNumber: '', address: { flat: '', area: '', landmark: '' } };

export function UserProfile() {
  const [savedData, setSavedData] = useState<SavedCheckout | null>(null);
  const [clearedAction, setClearedAction] = useState(false);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DeliveryDetails>(emptyDetails);
  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    const data = loadCheckout();
    if (data) setSavedData(data);
  }, []);

  const handleClearData = () => {
    clearCheckout();
    setSavedData(null);
    setClearedAction(true);
    setTimeout(() => setClearedAction(false), 3000);
  };

  const handleStartEdit = () => {
    setFormData(savedData || emptyDetails);
    setFormErrors({});
    setIsEditing(true);
  };

  const handleSaveData = () => {
    const errors = validateDetails(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      saveCheckout(formData);
      setSavedData(formData);
      setIsEditing(false);
    }
  };

  const addressString = savedData 
    ? [savedData.address.flat, savedData.address.area, savedData.address.landmark].filter(Boolean).join(', ')
    : '';

  return (
    <div className="mx-auto max-w-lg md:max-w-xl space-y-8 px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Header Profile Section --- */}
      <div className="flex items-center gap-5 pt-4 md:pt-8 pb-2">
        <div className="relative">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 shadow-inner ring-4 ring-white md:h-24 md:w-24">
            <User className="h-10 w-10 text-brand-700 md:h-12 md:w-12" />
          </div>
          {savedData && (
            <div className="absolute bottom-0 right-0 rounded-full bg-[#147a4a] p-1.5 ring-2 ring-white">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink md:text-4xl">My Profile</h1>
          <p className="mt-1 text-sm font-medium text-ink-muted md:text-base">Manage your details & preferences</p>
        </div>
      </div>

      {/* --- Section 1: Saved Details --- */}
      <section>
        <div className="mb-4 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-soft">Delivery Details</h2>
          {!isEditing && savedData && (
            <button 
              onClick={handleStartEdit} 
              className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 active:scale-95"
            >
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-gray-200/60 transition-all duration-300">
          {isEditing ? (
            <div className="p-5 sm:p-6 bg-gray-50/50">
              <DeliveryDetailsForm 
                value={formData} 
                errors={formErrors} 
                saveDetails={true} 
                onChange={setFormData} 
                onSaveDetailsChange={() => {}} 
              />
              <div className="mt-8 flex items-center gap-3">
                <Button variant="secondary" className="flex-1 rounded-[16px] h-12 bg-white border-gray-200" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button className="flex-1 rounded-[16px] h-12 shadow-md shadow-[#156253]/20" onClick={handleSaveData}>Save Details</Button>
              </div>
            </div>
          ) : savedData ? (
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-ink">{savedData.customerName}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-ink-muted">
                    <Phone className="h-3.5 w-3.5" />
                    {formatMobile(normalizeMobile(savedData.mobileNumber) ?? '')}
                  </p>
                </div>
                <button 
                  onClick={handleClearData}
                  className="grid h-10 w-10 place-items-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-90"
                  aria-label="Clear saved details"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex items-start gap-3.5 rounded-[16px] bg-[#f8fbfb] p-4 ring-1 ring-gray-100">
                <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white shadow-sm text-brand-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink-muted">
                  {addressString}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              {clearedAction ? (
                <div className="animate-in zoom-in duration-300">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#e5f7ed] text-[#147a4a]">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <p className="text-base font-bold text-ink">Details Cleared</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-gray-50 text-gray-300 ring-1 ring-gray-100">
                    <Map className="h-8 w-8" />
                  </div>
                  <p className="text-base font-bold text-ink">No address saved yet</p>
                  <p className="mt-1.5 mb-6 text-sm text-ink-muted max-w-[250px] mx-auto">Add your details for faster checkout next time.</p>
                  <Button variant="secondary" onClick={handleStartEdit} className="w-full max-w-[220px] rounded-[16px] h-12 bg-white border-gray-200">
                    <Plus className="mr-2 h-5 w-5 text-brand-700" /> Add Details
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- Section 2: Shortcuts --- */}
      <section>
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-soft px-1">My Orders</h2>
        <Link 
          href="/track" 
          className="group relative flex items-center justify-between overflow-hidden rounded-[24px] bg-gradient-to-br from-[#156253] to-[#0f4b3f] p-5 shadow-lg shadow-[#156253]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Decorative background element */}
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/20">
              <PackageSearch className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-white">Track My Orders</p>
              <p className="text-sm font-medium text-brand-100/80">View history & live status</p>
            </div>
          </div>
          <div className="relative z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-transform group-hover:translate-x-1">
            <ChevronRight className="h-5 w-5" />
          </div>
        </Link>
      </section>

      {/* --- Section 3: Help & Legal --- */}
      <section>
        <h2 className="mb-4 text-[13px] font-bold uppercase tracking-wider text-ink-soft px-1">Support & Legal</h2>
        <div className="divide-y divide-gray-100 overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-gray-200/60">
          
          <Link href="/faq" className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-4 text-ink">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm">
                <HelpCircle className="h-5 w-5" />
              </div>
              <span className="text-[15px] font-bold">FAQs</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </Link>

          <a href={SUPPORT_PHONE_TEL} className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-4 text-ink">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="block text-[15px] font-bold">Contact Support</span>
                <span className="block text-xs font-medium text-ink-muted mt-0.5">{SUPPORT_PHONE_DISPLAY}</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </a>

          <Link href="/privacy" className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-4 text-ink">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <span className="text-[15px] font-bold">Privacy Policy</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </Link>

          <Link href="/terms" className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-4 text-ink">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-50 text-gray-400 transition-colors group-hover:bg-white group-hover:text-brand-600 group-hover:shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[15px] font-bold">Terms & Conditions</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600" />
          </Link>

        </div>
      </section>

    </div>
  );
}