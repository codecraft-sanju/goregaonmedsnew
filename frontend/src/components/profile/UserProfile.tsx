// src/components/profile/UserProfile.tsx
'use client';

import { useEffect, useState } from 'react'; 
import Link from 'next/link';
import { 
  User, MapPin, PackageSearch, HelpCircle, Shield, 
  FileText, Phone, Trash2, ChevronRight, CheckCircle2, Plus, Edit2
} from 'lucide-react';
import { loadCheckout, clearCheckout, saveCheckout, type SavedCheckout } from '@/lib/checkoutStorage';
import { SUPPORT_PHONE_TEL, SUPPORT_PHONE_DISPLAY } from '@/lib/constants';
import { formatMobile, normalizeMobile } from '@/lib/format';
import { DeliveryDetailsForm, type DeliveryDetails } from '@/components/order/DeliveryDetailsForm';
import { Button } from '@/components/ui/Button';

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
    <div className="mx-auto max-w-md space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink">My Profile</h1>
        <p className="mt-1.5 text-sm text-ink-muted">Manage your details and preferences</p>
      </div>

      {/* Section 1: Saved Details */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Saved Details</h2>
          {!isEditing && savedData && (
            <button onClick={handleStartEdit} className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        <div className="card overflow-hidden bg-white shadow-sm ring-1 ring-brand-100">
          {isEditing ? (
            <div className="p-5">
              <DeliveryDetailsForm 
                value={formData} 
                errors={formErrors} 
                saveDetails={true} 
                onChange={setFormData} 
                onSaveDetailsChange={() => {}} // Always true when saving from profile
              />
              <div className="mt-6 flex items-center gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSaveData}>Save Details</Button>
              </div>
            </div>
          ) : savedData ? (
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-[#156253]">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">{savedData.customerName}</p>
                    <p className="text-sm font-medium text-ink-muted">{formatMobile(normalizeMobile(savedData.mobileNumber) ?? '')}</p>
                  </div>
                </div>
                <button 
                  onClick={handleClearData}
                  className="rounded-full p-2 text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                  aria-label="Clear saved details"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-3.5 ring-1 ring-brand-50">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p className="text-xs font-medium leading-relaxed text-ink-muted">
                  {addressString}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {clearedAction ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-[#147a4a] mb-2" />
                  <p className="text-sm font-bold text-ink">Details Cleared</p>
                </>
              ) : (
                <>
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-surface text-ink-soft mb-3">
                    <User className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-ink-muted">No address saved yet.</p>
                  <p className="mt-1 text-xs text-ink-soft mb-4">Add your details for faster checkout next time.</p>
                  {/* Yahan variant="outline" ko variant="secondary" kar diya hai */}
                  <Button variant="secondary" onClick={handleStartEdit} className="w-full max-w-[200px]">
                    <Plus className="mr-2 h-4 w-4" /> Add Details
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Shortcuts */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft px-1">My Orders</h2>
        <Link href="/track" className="card flex items-center justify-between bg-gradient-to-br from-[#e5f7ed] to-[#d3f0e0] p-4 shadow-sm transition-transform hover:scale-[1.01]">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#156253] shadow-sm">
              <PackageSearch className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-base font-bold text-ink">Track My Orders</p>
              <p className="text-xs font-medium text-[#4a6358]">View order history and status</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#156253]" />
        </Link>
      </section>

      {/* Section 3: Help & Legal */}
      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft px-1">Support & Legal</h2>
        <div className="card divide-y divide-brand-50 bg-white shadow-sm ring-1 ring-brand-100">
          
          <Link href="/faq" className="flex items-center justify-between p-4 transition-colors hover:bg-brand-50/50">
            <div className="flex items-center gap-3 text-ink">
              <HelpCircle className="h-5 w-5 text-ink-muted" />
              <span className="text-sm font-semibold">FAQs</span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </Link>

          <a href={SUPPORT_PHONE_TEL} className="flex items-center justify-between p-4 transition-colors hover:bg-brand-50/50">
            <div className="flex items-center gap-3 text-ink">
              <Phone className="h-5 w-5 text-ink-muted" />
              <div>
                <span className="block text-sm font-semibold">Contact Support</span>
                <span className="block text-[10px] text-ink-muted">{SUPPORT_PHONE_DISPLAY}</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </a>

          <Link href="/privacy" className="flex items-center justify-between p-4 transition-colors hover:bg-brand-50/50">
            <div className="flex items-center gap-3 text-ink">
              <Shield className="h-5 w-5 text-ink-muted" />
              <span className="text-sm font-semibold">Privacy Policy</span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </Link>

          <Link href="/terms" className="flex items-center justify-between p-4 transition-colors hover:bg-brand-50/50">
            <div className="flex items-center gap-3 text-ink">
              <FileText className="h-5 w-5 text-ink-muted" />
              <span className="text-sm font-semibold">Terms & Conditions</span>
            </div>
            <ChevronRight className="h-4 w-4 text-ink-soft" />
          </Link>

        </div>
      </section>

    </div>
  );
}