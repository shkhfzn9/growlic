'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import QRCode from 'qrcode';

export default function AdminSettingsPage() {
  const auth = useSelector((state: RootState) => state.auth);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const menuUrl = auth.restaurantId && typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${auth.restaurantId}`
    : '';

  useEffect(() => {
    if (typeof window !== 'undefined' && auth.restaurantId) {
      const origin = window.location.origin;
      const targetUrl = `${origin}/menu/${auth.restaurantId}`;

      // Generate B&W QR Code (high resolution, high contrast)
      QRCode.toDataURL(
        targetUrl,
        {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000', // Black modules
            light: '#FFFFFF', // White background
          },
        },
        (err, url) => {
          if (err) {
            console.error('Error generating QR code:', err);
            return;
          }
          setQrCodeUrl(url);
        }
      );
    }
  }, [auth.restaurantId]);

  const handlePrint = () => {
    if (typeof window === 'undefined') return;

    // Create a simple popup window for printing QR code cleanly
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocked. Please allow pop-ups to print the QR code.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${auth.restaurantName || 'Menu'}</title>
          <style>
            body {
              font-family: monospace;
              text-align: center;
              padding: 10% 5%;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 5px;
            }
            .subtitle {
              font-size: 14px;
              color: #555;
              margin-bottom: 30px;
              text-transform: uppercase;
            }
            .qr-img {
              width: 300px;
              height: 300px;
              border: 2px solid #000;
              padding: 10px;
            }
            .url {
              margin-top: 20px;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="title">${auth.restaurantName || 'Restaurant Menu'}</div>
          <div class="subtitle">Scan to Order</div>
          <img src="${qrCodeUrl}" class="qr-img" />
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
    <div className="font-mono-custom flex flex-col gap-6 max-w-xl mx-auto">
      {/* Title */}
      <div className="border-b border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">Settings</h1>
        <span className="text-xs uppercase text-zinc-500">Configure your restaurant qr order details</span>
      </div>

      {/* QR Code section */}
      <div className="border border-black p-6 bg-white flex flex-col items-center text-center gap-6">
        <div className="border-b border-black pb-2 w-full">
          <h2 className="text-sm font-bold uppercase">Customer Shareable QR Code</h2>
          <span className="text-[10px] text-zinc-500 uppercase">Scan to instantly view the menu</span>
        </div>

        {qrCodeUrl ? (
          <div className="flex flex-col items-center gap-4">
            {/* QR Code image preview */}
            <div className="border-2 border-black p-2 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeUrl} alt="Restaurant Menu QR Code" className="w-64 h-64 select-none" />
            </div>

            <div className="text-xs break-all uppercase border border-black bg-zinc-50 px-3 py-2 max-w-full">
              <strong>URL:</strong> {menuUrl}
            </div>

            {/* Print & Download actions */}
            <div className="flex gap-4 mt-2">
              <a
                href={qrCodeUrl}
                download={`${auth.restaurantId || 'restaurant'}-qr.png`}
                className="border border-black bg-black text-white hover:bg-white hover:text-black px-4 py-2 text-xs font-bold uppercase transition-all"
              >
                [ DOWNLOAD QR ]
              </a>
              <button
                onClick={handlePrint}
                className="border border-black bg-white text-black hover:bg-black hover:text-white px-4 py-2 text-xs font-bold uppercase transition-all cursor-pointer"
              >
                [ PRINT QR ]
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs uppercase text-zinc-500 py-12">Generating QR Code...</div>
        )}
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
