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
    name: `Staff SOP Tracker - ${displayName}`,
    short_name: 'Staff Tracker',
    description: `Daily SOP checklist and task logger for ${displayName} kitchen staff.`,
    scope: `/staff-tracker/${formattedId}`,
    start_url: `/staff-tracker/${formattedId}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#111827',
    theme_color: '#10B981',
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
