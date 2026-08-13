'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import QRCode from 'qrcode';
import { getRestaurantDetails, saveRestaurantBranding } from '@/actions/auth';
import { PageHeader, AdminButton } from '@/components/ui';
import { Plus, Trash2, Download, Printer, CheckCircle } from 'lucide-react';

export function getBaseAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.origin;
    }
  }
  return 'https://growlic.vercel.app';
}

export default function SettingsPage() {
  const auth = useSelector((state: RootState) => state.auth);

  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to our restaurant!');
  const [whatsappNumber, setWhatsappNumber] = useState('9541234068');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [callStaffEnabled, setCallStaffEnabled] = useState(true);

  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [stampsRequired, setStampsRequired] = useState(8);
  const [discountPercentage, setDiscountPercentage] = useState(20);
  const [loyaltySaving, setLoyaltySaving] = useState(false);
  const [loyaltySaveSuccess, setLoyaltySaveSuccess] = useState(false);

  const [maintenanceModeEnabled, setMaintenanceModeEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Kitchen is currently under maintenance. Ordering will resume shortly.');
  const [maintenanceEstimatedRestore, setMaintenanceEstimatedRestore] = useState('');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [maintenanceSaveSuccess, setMaintenanceSaveSuccess] = useState(false);

  const [tables, setTables] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details) {
          setLogoUrl(details.logoUrl || '');
          setPrimaryColor(details.primaryColor || '#000000');
          setWelcomeMessage(details.welcomeMessage || 'Welcome to our restaurant!');
          setWhatsappNumber(details.whatsappNumber || details.phone || '9541234068');
          setLoyaltyEnabled(!!details.loyaltyEnabled);
          setCallStaffEnabled(details.callStaffEnabled !== false);
          setStampsRequired(details.stampsRequired ?? 8);
          setDiscountPercentage(details.discountPercentage ?? 20);
          setMaintenanceModeEnabled(!!details.maintenanceModeEnabled);
          setMaintenanceMessage(details.maintenanceMessage || 'Kitchen is currently under maintenance. Ordering will resume shortly.');
          setMaintenanceEstimatedRestore(details.maintenanceEstimatedRestore || '');
        }
      } catch (err) {
        console.error('Failed to load branding settings:', err);
      }
    };

    if (auth.isLoggedIn && auth.restaurantId) {
      loadDetails();
      const stored = localStorage.getItem(`growlic_tables_${auth.restaurantId}`);
      if (stored) setTables(JSON.parse(stored));
    }
  }, [auth.isLoggedIn, auth.restaurantId]);

  useEffect(() => {
    if (auth.restaurantId && tables.length > 0) {
      const origin = getBaseAppUrl();
      const newUrls: Record<string, string> = {};

      const generateAllQrs = async () => {
        for (const table of tables) {
          const targetUrl = `${origin}/menu/${auth.restaurantId}?table=${encodeURIComponent(table)}`;
          try {
            const url = await QRCode.toDataURL(targetUrl, { width: 512, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } });
            newUrls[table] = url;
          } catch (err) {
            console.error('Error generating QR:', err);
          }
        }
        setQrUrls(newUrls);
      };

      generateAllQrs();
    }
  }, [auth.restaurantId, tables]);

  const saveTables = (newTables: string[]) => {
    setTables(newTables);
    if (auth.restaurantId) {
      localStorage.setItem(`growlic_tables_${auth.restaurantId}`, JSON.stringify(newTables));
    }
  };

  const addTable = () => {
    const label = newTableLabel.trim();
    if (!label) return;
    if (tables.includes(label)) { alert('Table ID already exists'); return; }
    saveTables([...tables, label]);
    setNewTableLabel('');
  };

  const removeTable = (label: string) => {
    if (confirm(`Remove table "${label}"?`)) {
      saveTables(tables.filter(t => t !== label));
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveRestaurantBranding({ 
        logoUrl, 
        primaryColor, 
        welcomeMessage,
        whatsappNumber,
        loyaltyEnabled,
        callStaffEnabled,
        stampsRequired,
        discountPercentage,
        maintenanceModeEnabled,
        maintenanceMessage,
        maintenanceEstimatedRestore,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loyaltyEnabled) {
      if (stampsRequired <= 0) {
        alert('Stamps required must be greater than 0.');
        return;
      }
      if (discountPercentage < 1 || discountPercentage > 100) {
        alert('Discount percentage must be between 1 and 100.');
        return;
      }
    }

    setLoyaltySaving(true);
    setLoyaltySaveSuccess(false);
    try {
      await saveRestaurantBranding({
        logoUrl,
        primaryColor,
        welcomeMessage,
        loyaltyEnabled,
        callStaffEnabled,
        stampsRequired,
        discountPercentage,
        maintenanceModeEnabled,
        maintenanceMessage,
        maintenanceEstimatedRestore,
      });
      setLoyaltySaveSuccess(true);
      setTimeout(() => setLoyaltySaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoyaltySaving(false);
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setMaintenanceSaving(true);
    setMaintenanceSaveSuccess(false);
    try {
      await saveRestaurantBranding({
        logoUrl,
        primaryColor,
        welcomeMessage,
        whatsappNumber,
        loyaltyEnabled,
        callStaffEnabled,
        stampsRequired,
        discountPercentage,
        maintenanceModeEnabled,
        maintenanceMessage,
        maintenanceEstimatedRestore,
      });
      setMaintenanceSaveSuccess(true);
      setTimeout(() => setMaintenanceSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save maintenance settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handlePrintTable = (table: string, qrUrl: string) => {
    if (typeof window === 'undefined') return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Pop-up blocked. Please allow pop-ups to print the QR code.'); return; }

    const menuUrl = `${getBaseAppUrl()}/menu/${auth.restaurantId}?table=${encodeURIComponent(table)}`;
    printWindow.document.write(`
      <html>
        <head>
          <title>QR - ${auth.restaurantName || 'Menu'} - Table ${table}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; text-align: center; padding: 8% 5%; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .table-label { font-size: 20px; font-weight: bold; margin-bottom: 25px; border: 2px solid #111; display: inline-block; padding: 5px 20px; border-radius: 8px; }
            .subtitle { font-size: 13px; color: #555; margin-bottom: 30px; }
            .qr-img { width: 320px; height: 320px; border: 2px solid #E2E6EA; padding: 10px; border-radius: 12px; }
            .url { margin-top: 20px; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div class="title">${auth.restaurantName || 'Restaurant Menu'}</div>
          <div class="table-label">Table ${table}</div>
          <div class="subtitle">Scan to order directly from your table</div>
          <img src="${qrUrl}" class="qr-img" />
          <div class="url">${menuUrl}</div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl pb-12">
      <PageHeader title="Settings" subtitle="Configure branding and table QR codes" />

      {/* Branding */}
      <form onSubmit={handleSaveBranding} className="bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">Custom Branding</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Personalize the customer-facing menu appearance</p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-lg p-3 text-sm text-[#16A34A] font-medium">
            <CheckCircle className="w-4 h-4" /> Settings saved successfully
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Logo URL</label>
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 cursor-pointer border border-[#E2E6EA] rounded-lg p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] font-mono"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Welcome Message</label>
            <input
              type="text"
              placeholder="Welcome to our restaurant!"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
            WhatsApp & Direct Call Number (Emergency / Order Alerts)
          </label>
          <input
            type="tel"
            placeholder="e.g. 9541234068"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors font-mono"
            required
          />
          <span className="text-xs text-[#6B7280]">
            Customers can send order details directly to this WhatsApp number or call for emergency order confirmation if pending.
          </span>
        </div>

        <div className="flex items-center gap-3 bg-[#F4F6F9] border border-[#E2E6EA] rounded-lg p-4">
          <input
            type="checkbox"
            id="callStaffEnabled"
            checked={callStaffEnabled}
            onChange={(e) => setCallStaffEnabled(e.target.checked)}
            className="w-4.5 h-4.5 text-[#C0181A] border-gray-300 rounded focus:ring-[#C0181A]/20 cursor-pointer"
          />
          <label htmlFor="callStaffEnabled" className="text-sm font-semibold text-[#111827] cursor-pointer select-none">
            Enable "Call Staff" Button on Customer App
            <span className="text-xs text-[#6B7280] font-normal block mt-0.5">Allow customers to ring staff alerts from their table</span>
          </label>
        </div>

        <AdminButton type="submit" loading={saving} className="w-full">
          Save Branding
        </AdminButton>
      </form>

      {/* Loyalty Program */}
      <form onSubmit={handleSaveLoyalty} className="bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">Loyalty Program Settings</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Enable and configure customer stamps loyalty rewards</p>
        </div>

        {loyaltySaveSuccess && (
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-lg p-3 text-sm text-[#16A34A] font-medium">
            <CheckCircle className="w-4 h-4" /> Loyalty settings saved successfully
          </div>
        )}

        <div className="flex items-center justify-between p-3.5 bg-[#F4F6F9] rounded-lg border border-[#E2E6EA]">
          <div>
            <span className="text-sm font-semibold text-[#111827] block">Enable Loyalty Program</span>
            <span className="text-xs text-[#6B7280]">Customers will earn stamps and redeem discounts</span>
          </div>
          <button
            type="button"
            onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              loyaltyEnabled ? 'bg-[#C0181A]' : 'bg-[#E2E6EA]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                loyaltyEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {loyaltyEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Stamps Required</label>
              <input
                type="number"
                min="1"
                placeholder="8"
                value={stampsRequired}
                onChange={(e) => setStampsRequired(parseInt(e.target.value) || 0)}
                className="px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">Discount Percentage (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                placeholder="20"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseInt(e.target.value) || 0)}
                className="px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
                required
              />
            </div>
          </div>
        )}

        <AdminButton type="submit" loading={loyaltySaving} className="w-full">
          Save Loyalty Settings
        </AdminButton>
      </form>

      {/* Store Maintenance & Ordering Pause */}
      <form onSubmit={handleSaveMaintenance} className="bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827] flex items-center gap-2">
            <span>🛠️ Kitchen Maintenance & Pause Ordering</span>
          </h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Temporarily pause customer ordering while keeping your QR code menu fully viewable as a digital menu.
          </p>
        </div>

        {maintenanceSaveSuccess && (
          <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-lg p-3 text-sm text-[#16A34A] font-medium">
            <CheckCircle className="w-4 h-4" /> Maintenance settings saved successfully
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-[#F4F6F9] rounded-xl border border-[#E2E6EA]">
          <div>
            <span className="text-sm font-bold text-[#111827] block">
              {maintenanceModeEnabled ? '🔴 Maintenance Mode ACTIVE (Ordering Paused)' : '🟢 Ordering Active (Normal Operations)'}
            </span>
            <span className="text-xs text-[#6B7280]">
              {maintenanceModeEnabled
                ? 'QR scans will open the digital menu. Cart ordering is paused.'
                : 'Customers can add items to cart and place orders normally.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMaintenanceModeEnabled(!maintenanceModeEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              maintenanceModeEnabled ? 'bg-[#C0181A]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md ${
                maintenanceModeEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {maintenanceModeEnabled && (
          <div className="flex flex-col gap-4 bg-amber-50/60 border border-amber-200/60 rounded-xl p-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
                Maintenance Notice Message (Shown to Customers)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Kitchen is refilling supplies. Ordering will resume shortly."
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="px-3 py-2.5 text-sm border border-amber-300/80 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-900">
                Expected Restoration Date & Time (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Today by 4:30 PM (or 2026-08-12 16:30)"
                value={maintenanceEstimatedRestore}
                onChange={(e) => setMaintenanceEstimatedRestore(e.target.value)}
                className="px-3 py-2.5 text-sm border border-amber-300/80 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
              />
              <span className="text-[11px] text-amber-800/80">
                This note will be shown on the customer cart screen to inform guests when ordering resumes.
              </span>
            </div>
          </div>
        )}

        <AdminButton type="submit" loading={maintenanceSaving} className="w-full">
          Save Maintenance Settings
        </AdminButton>
      </form>

      {/* Table QR Codes */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#111827]">Table QR Codes</h2>
          <p className="text-[13px] text-[#6B7280] mt-0.5">Generate and print table-scoped QR codes for ordering</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Table ID (e.g. 5, Bar-Left)"
            value={newTableLabel}
            onChange={(e) => setNewTableLabel(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
            className="flex-1 px-3 py-2.5 text-sm border border-[#E2E6EA] rounded-lg bg-[#F4F6F9] outline-none focus:ring-2 focus:ring-[#C0181A]/20 focus:border-[#C0181A] transition-colors"
          />
          <AdminButton onClick={addTable} icon={<Plus className="w-4 h-4" />}>Add</AdminButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map((table) => {
            const tableQrUrl = qrUrls[table];
            return (
              <div key={table} className="bg-[#F4F6F9] border border-[#E2E6EA] rounded-xl p-4 flex flex-col items-center gap-3">
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm font-semibold text-[#111827]">Table {table}</span>
                  <button onClick={() => removeTable(table)} className="text-[#DC2626] hover:bg-[#FEF2F2] p-1 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {tableQrUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white border border-[#E2E6EA] rounded-lg p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tableQrUrl} alt={`Table ${table} QR`} className="w-36 h-36" />
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={tableQrUrl}
                        download={`table-${table}-qr.png`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E2E6EA] rounded-lg hover:bg-[#F4F6F9] transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </a>
                      <button
                        onClick={() => handlePrintTable(table, tableQrUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E2E6EA] rounded-lg hover:bg-[#F4F6F9] transition-colors"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6">
                    <div className="w-6 h-6 border-2 border-[#E2E6EA] border-t-[#C0181A] rounded-full animate-spin" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Restaurant Info */}
      <div className="bg-white border border-[#E2E6EA] rounded-xl p-6">
        <h2 className="text-[15px] font-semibold text-[#111827] mb-4">Restaurant Details</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <span className="text-[#6B7280]">Restaurant Name</span>
          <span className="font-medium text-[#111827]">{auth.restaurantName}</span>
          <span className="text-[#6B7280]">Slug / ID</span>
          <span className="font-mono text-[13px] text-[#111827]">{auth.restaurantId}</span>
          <span className="text-[#6B7280]">Admin Email</span>
          <span className="font-mono text-[13px] text-[#111827]">{auth.email}</span>
        </div>
      </div>
    </div>
  );
}
