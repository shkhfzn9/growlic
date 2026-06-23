'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import QRCode from 'qrcode';
import { getRestaurantDetails, saveRestaurantBranding } from '@/actions/auth';

export default function AdminSettingsPage() {
  const auth = useSelector((state: RootState) => state.auth);

  // Branding states
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to our restaurant!');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Table QR states
  const [tables, setTables] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [newTableLabel, setNewTableLabel] = useState('');
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

  // Hydrate tables and branding configurations from DB
  useEffect(() => {
    const loadDetails = async () => {
      try {
        const details = await getRestaurantDetails();
        if (details) {
          setLogoUrl(details.logoUrl || '');
          setPrimaryColor(details.primaryColor || '#000000');
          setWelcomeMessage(details.welcomeMessage || 'Welcome to our restaurant!');
        }
      } catch (err) {
        console.error('Failed to load branding settings:', err);
      }
    };

    if (auth.isLoggedIn && auth.restaurantId) {
      loadDetails();

      // Retrieve custom table list from local storage
      const stored = localStorage.getItem(`growlic_tables_${auth.restaurantId}`);
      if (stored) {
        setTables(JSON.parse(stored));
      }
    }
  }, [auth.isLoggedIn, auth.restaurantId]);

  // Generate Table Specific QR code mappings
  useEffect(() => {
    if (auth.restaurantId && tables.length > 0) {
      const origin = window.location.origin;
      const newUrls: Record<string, string> = {};

      const generateAllQrs = async () => {
        for (const table of tables) {
          const targetUrl = `${origin}/menu/${auth.restaurantId}?table=${encodeURIComponent(table)}`;
          try {
            const url = await QRCode.toDataURL(targetUrl, {
              width: 512,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF',
              },
            });
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
    if (tables.includes(label)) {
      alert('Table ID already exists');
      return;
    }
    const updated = [...tables, label];
    saveTables(updated);
    setNewTableLabel('');
  };

  const removeTable = (label: string) => {
    if (confirm(`Are you sure you want to remove table "${label}"?`)) {
      const updated = tables.filter(t => t !== label);
      saveTables(updated);
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

  const handlePrintTable = (table: string, qrUrl: string) => {
    if (typeof window === 'undefined') return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print the QR code.');
      return;
    }

    const menuUrl = `${window.location.origin}/menu/${auth.restaurantId}?table=${encodeURIComponent(table)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${auth.restaurantName || 'Menu'} - Table ${table}</title>
          <style>
            body {
              font-family: monospace;
              text-align: center;
              padding: 8% 5%;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 5px;
            }
            .table-label {
              font-size: 20px;
              font-weight: bold;
              margin-bottom: 25px;
              text-transform: uppercase;
              border: 2px solid black;
              display: inline-block;
              padding: 5px 20px;
            }
            .subtitle {
              font-size: 11px;
              color: #555;
              margin-bottom: 30px;
              text-transform: uppercase;
            }
            .qr-img {
              width: 320px;
              height: 320px;
              border: 2px solid #000;
              padding: 10px;
            }
            .url {
              margin-top: 20px;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="title">${auth.restaurantName || 'Restaurant Menu'}</div>
          <div class="table-label">TABLE ${table}</div>
          <div class="subtitle">Scan to Order directly from your table</div>
          <img src="${qrUrl}" class="qr-img" />
          <div class="url">${menuUrl}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="font-mono-custom flex flex-col gap-6 max-w-xl mx-auto pb-12">
      {/* Title */}
      <div className="border-b border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">Settings</h1>
        <span className="text-xs uppercase text-zinc-500">Configure your restaurant qr order details and branding</span>
      </div>

      {/* Brand Customization settings */}
      <form onSubmit={handleSaveBranding} className="border border-black p-6 bg-white flex flex-col gap-4">
        <div className="border-b border-black pb-2">
          <h2 className="text-sm font-bold uppercase">Custom Branding & Theme</h2>
        </div>

        {saveSuccess && (
          <div className="border border-black p-3 text-xs bg-zinc-100 font-bold text-green-600 uppercase">
            ✔ BRANDING CONFIGURATIONS SAVED SUCCESSFULLY
          </div>
        )}

        {/* Logo URL */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase">Logo Image URL</label>
          <input
            type="url"
            placeholder="e.g. https://myrestaurant.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full text-xs font-mono-custom"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Primary brand color */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase">Primary Brand Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-8 cursor-pointer border border-black rounded-none p-0"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full text-xs font-mono-custom"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase">Welcome Message</label>
            <input
              type="text"
              placeholder="e.g. Welcome to Tokyo Momos!"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full text-xs font-mono-custom"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="border-2 border-black w-full py-2.5 text-xs font-bold uppercase bg-black text-white hover:bg-white hover:text-black transition-all cursor-pointer mt-2"
        >
          {saving ? 'SAVING DETAILS...' : '[ SAVE BRAND CONFIGURATIONS ]'}
        </button>
      </form>

      {/* Table Management & QR Section */}
      <div className="border border-black p-6 bg-white flex flex-col gap-6">
        <div className="border-b border-black pb-2 w-full">
          <h2 className="text-sm font-bold uppercase">Table QR Code Manager</h2>
          <span className="text-[10px] text-zinc-500 uppercase">Generate and print table-scoped scanning codes</span>
        </div>

        {/* Add Table Label */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Table ID (e.g. 5, Bar-Left, Balcony-3)"
            value={newTableLabel}
            onChange={(e) => setNewTableLabel(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
            className="w-full text-xs font-mono-custom"
          />
          <button
            onClick={addTable}
            className="border border-black bg-black text-white hover:bg-white hover:text-black px-4 text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap"
          >
            [ ADD TABLE ]
          </button>
        </div>

        {/* Tables QR Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map((table) => {
            const tableQrUrl = qrUrls[table];
            return (
              <div key={table} className="border border-black p-4 bg-zinc-50 flex flex-col items-center gap-3">
                <div className="flex justify-between items-center w-full border-b border-black pb-1">
                  <span className="text-xs font-bold uppercase">Table {table}</span>
                  <button
                    onClick={() => removeTable(table)}
                    className="text-[10px] text-red-600 hover:underline bg-transparent border-0 cursor-pointer uppercase font-bold"
                  >
                    [ Delete ]
                  </button>
                </div>

                {tableQrUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="border border-black p-1 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tableQrUrl} alt={`Table ${table} QR`} className="w-40 h-40 select-none" />
                    </div>
                    <div className="flex gap-2 mt-1">
                      <a
                        href={tableQrUrl}
                        download={`table-${table}-qr.png`}
                        className="border border-black bg-black text-white hover:bg-white hover:text-black px-2 py-1 text-[9px] font-bold uppercase transition-all"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handlePrintTable(table, tableQrUrl)}
                        className="border border-black bg-white text-black hover:bg-black hover:text-white px-2 py-1 text-[9px] font-bold uppercase transition-all cursor-pointer"
                      >
                        Print QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] uppercase text-zinc-500 py-6">Generating...</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Restaurant details */}
      <div className="border border-black p-6 bg-white flex flex-col gap-4">
        <div className="border-b border-black pb-2">
          <h2 className="text-sm font-bold uppercase">Restaurant Details</h2>
        </div>

        <div className="grid grid-cols-2 text-xs gap-3">
          <span className="font-bold uppercase text-zinc-500">Restaurant Name</span>
          <span className="font-bold uppercase">{auth.restaurantName}</span>

          <span className="font-bold uppercase text-zinc-500">Slug / ID</span>
          <span className="font-mono-custom lowercase">{auth.restaurantId}</span>

          <span className="font-bold uppercase text-zinc-500">Admin Email</span>
          <span className="font-mono-custom lowercase">{auth.email}</span>
        </div>
      </div>
    </div>
  );
}
