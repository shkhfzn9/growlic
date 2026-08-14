import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  const formattedId = restaurantId || 'tokyo-momos';
  const displayName = formattedId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const manifest = {
    name: `Daily Expense Tracker - ${displayName}`,
    short_name: 'Expense Tracker',
    description: `Daily raw ingredient and operational expense logger for ${displayName}.`,
    scope: `/expense-tracker/${formattedId}`,
    start_url: `/expense-tracker/${formattedId}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#111827',
    theme_color: '#3B82F6',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64 32x32 24x24 16x16',
        type: 'image/x-icon',
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
