import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    name: 'Growlic Admin Portal',
    short_name: 'Growlic Admin',
    description: 'Complete restaurant management, kitchen order dispatch, menu & sales analytics.',
    scope: '/admin/',
    start_url: '/admin',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0F172A',
    theme_color: '#C0181A',
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
