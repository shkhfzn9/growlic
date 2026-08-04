'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getAdminDeveloperPromo, saveDeveloperPromo } from '../services/menu.service';
import { PageHeader, AdminButton } from '@/components/ui';
import {
  Code2,
  CheckCircle,
  Sparkles,
  ExternalLink,
  Palette,
  Eye,
  Settings2,
  Layers,
  Zap,
} from 'lucide-react';
import { DeveloperPromoData } from '../types/menu.types';

const COLOR_PRESETS = [
  {
    name: 'Midnight Slate (Default)',
    from: '#0F172A',
    to: '#1E1B4B',
    textColor: '#FFFFFF',
    ctaBg: '#F5C518',
    ctaText: '#1A1A1A',
  },
  {
    name: 'Cyber Purple',
    from: '#2E1065',
    to: '#581C87',
    textColor: '#FFFFFF',
    ctaBg: '#A855F7',
    ctaText: '#FFFFFF',
  },
  {
    name: 'Emerald Tech',
    from: '#064E3B',
    to: '#022C22',
    textColor: '#FFFFFF',
    ctaBg: '#10B981',
    ctaText: '#064E3B',
  },
  {
    name: 'Deep Crimson',
    from: '#881337',
    to: '#4C0519',
    textColor: '#FFFFFF',
    ctaBg: '#F43F5E',
    ctaText: '#FFFFFF',
  },
  {
    name: 'Gold Luxury',
    from: '#1C1917',
    to: '#292524',
    textColor: '#FDE047',
    ctaBg: '#EAB308',
    ctaText: '#000000',
  },
  {
    name: 'Royal Blue',
    from: '#1E3A8A',
    to: '#1E1B4B',
    textColor: '#FFFFFF',
    ctaBg: '#3B82F6',
    ctaText: '#FFFFFF',
  },
];

export default function DeveloperPromoManager() {
  const auth = useSelector((state: RootState) => state.auth);

  const [active, setActive] = useState(true);
  const [position, setPosition] = useState<number>(2);
  const [headline, setHeadline] = useState('Your Business Deserves Better Software.');
  const [subheadline, setSubheadline] = useState(
    'Custom websites, web apps, mobile apps & AI automation built to grow your business.'
  );
  const [ctaText, setCtaText] = useState('Book a Free Consultation');
  const [ctaLink, setCtaLink] = useState('https://growlic.com');
  const [badgeText, setBadgeText] = useState('SOFTWARE & DIGITAL SOLUTIONS');
  const [image, setImage] = useState('/Screenshot 2026-08-03 175540.png');

  const [bgColorFrom, setBgColorFrom] = useState('#0F172A');
  const [bgColorTo, setBgColorTo] = useState('#1E1B4B');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [ctaBgColor, setCtaBgColor] = useState('#F5C518');
  const [ctaTextColor, setCtaTextColor] = useState('#1A1A1A');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadPromo = async () => {
    setLoading(true);
    try {
      const data: DeveloperPromoData = await getAdminDeveloperPromo();
      if (data) {
        setActive(data.active !== undefined ? data.active : true);
        setPosition(data.position !== undefined ? Number(data.position) : 2);
        setHeadline(data.headline || 'Your Business Deserves Better Software.');
        setSubheadline(
          data.subheadline ||
            'Custom websites, web apps, mobile apps & AI automation built to grow your business.'
        );
        setCtaText(data.ctaText || 'Book a Free Consultation');
        setCtaLink(data.ctaLink || 'https://growlic.com');
        setBadgeText(data.badgeText || 'SOFTWARE & DIGITAL SOLUTIONS');
        setImage(data.image || '/Screenshot 2026-08-03 175540.png');
        setBgColorFrom(data.bgColorFrom || '#0F172A');
        setBgColorTo(data.bgColorTo || '#1E1B4B');
        setTextColor(data.textColor || '#FFFFFF');
        setCtaBgColor(data.ctaBgColor || '#F5C518');
        setCtaTextColor(data.ctaTextColor || '#1A1A1A');
      }
    } catch (err) {
      console.error('Failed to load developer promo settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.isLoggedIn && auth.restaurantId) {
      loadPromo();
    }
  }, [auth.isLoggedIn, auth.restaurantId]);

  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    setBgColorFrom(preset.from);
    setBgColorTo(preset.to);
    setTextColor(preset.textColor);
    setCtaBgColor(preset.ctaBg);
    setCtaTextColor(preset.ctaText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim()) return;

    setSaving(true);
    setSaveSuccess(false);
    try {
      await saveDeveloperPromo({
        active,
        position,
        headline,
        subheadline,
        ctaText,
        ctaLink,
        badgeText,
        image,
        bgColorFrom,
        bgColorTo,
        textColor,
        ctaBgColor,
        ctaTextColor,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert(
        'Failed to save Developer Promo: ' +
          (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse p-6">
        <div className="h-8 w-64 bg-[#E2E6EA] rounded-lg" />
        <div className="h-48 bg-white border border-[#E2E6EA] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      <PageHeader
        title="Developer Promo"
        subtitle="Manage & customize the development/agency promotional banner shown in customer menu banner section"
      />

      {saveSuccess && (
        <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#16A34A]/20 rounded-xl p-4 text-sm text-[#16A34A] font-semibold shadow-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-[#16A34A]" />
          Developer Promo banner settings saved successfully! Changes are live on your customer menu page.
        </div>
      )}

      {/* Live Preview Card */}
      <div className="bg-white border border-[#E2E6EA] rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-[#E2E6EA] pb-3">
          <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#C0181A]" /> Live Customer Preview
          </h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {active ? '🟢 Banner Active' : '⚪ Banner Hidden'}
          </span>
        </div>

        <p className="text-xs text-[#6B7280]">
          This is how your Developer Promo advertisement will look inside the top banner ads carousel on the customer menu page.
        </p>

        {/* Banner Render Component Preview */}
        <div className="w-full flex justify-center py-2">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl h-[140px] shadow-[0_6px_24px_rgba(0,0,0,0.25)] relative transition-all duration-300">
            <div
              className="w-full h-full flex items-stretch relative"
              style={{
                background: `linear-gradient(135deg, ${bgColorFrom} 0%, ${bgColorTo} 100%)`,
              }}
            >
              <div className="w-[65%] sm:w-[70%] p-4 sm:p-5 flex flex-col justify-between relative z-10">
                <div>
                  <span
                    className="inline-block text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider mb-1"
                    style={{
                      backgroundColor: `${ctaBgColor}25`,
                      color: ctaBgColor,
                      border: `1px solid ${ctaBgColor}40`,
                    }}
                  >
                    ⚡ {badgeText || 'DEVELOPMENT SERVICES'}
                  </span>
                  <h2
                    className="font-black text-sm sm:text-lg leading-tight tracking-tight whitespace-pre-line line-clamp-2"
                    style={{ color: textColor }}
                  >
                    {headline}
                  </h2>
                  {subheadline && (
                    <p
                      className="text-[10px] sm:text-xs mt-1 font-medium line-clamp-2"
                      style={{ color: textColor, opacity: 0.8 }}
                    >
                      {subheadline}
                    </p>
                  )}
                </div>

                {ctaText && (
                  <div
                    className="mt-2 text-[10px] sm:text-xs font-bold uppercase px-4 py-2 rounded-full w-fit shadow-md flex items-center gap-1.5 transition-transform"
                    style={{ backgroundColor: ctaBgColor, color: ctaTextColor }}
                  >
                    <span>{ctaText}</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Right side Developer Image Container */}
              <div className="w-[35%] sm:w-[30%] relative overflow-hidden flex-shrink-0 bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image || '/Screenshot 2026-08-03 175540.png'}
                  alt={headline || 'Developer Promo'}
                  className="w-full h-full object-cover object-center scale-105"
                />
                {/* Curved Arc Separator matching gradient start color */}
                <svg
                  className="absolute left-0 top-0 h-full w-6 z-10"
                  viewBox="0 0 24 100"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M24,0 C0,25 0,75 24,100 L0,100 L0,0 Z"
                    fill={bgColorFrom || '#0F172A'}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Text & Content Configuration */}
        <div className="flex-1 bg-white border border-[#E2E6EA] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="border-b border-[#E2E6EA] pb-3">
            <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-[#C0181A]" /> Ad Content & Details
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Customize the copy and link target for your software development promotion.
            </p>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E6EA] rounded-xl p-4">
            <div>
              <label className="text-sm font-bold text-[#1E293B] block">Enable Developer Promo Banner</label>
              <span className="text-xs text-[#64748B]">
                Show this promotional ad card in the banner ads carousel on the customer menu page.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                active ? 'bg-[#10B981]' : 'bg-[#CBD5E1]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Ad Carousel Placement / Arrangement */}
          <div className="flex flex-col gap-3 bg-[#F8FAFC] border border-[#E2E6EA] rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-[#1E293B] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#C0181A]" /> Ad Placement / Carousel Position
                </label>
                <span className="text-xs text-[#64748B]">
                  Choose whether this Developer Promo ad appears as the very 1st slide or the very Last slide in the customer menu carousel.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              {[
                { pos: 1, label: '🥇 First Slide', desc: 'Appears first before all food banners' },
                { pos: 2, label: '🏁 Last Slide', desc: 'Appears last after all food banners' },
              ].map((item) => (
                <button
                  key={item.pos}
                  type="button"
                  onClick={() => setPosition(item.pos)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                    position === item.pos
                      ? 'bg-[#C0181A] text-white border-[#C0181A] shadow-md font-bold ring-2 ring-[#C0181A]/30'
                      : 'bg-white text-[#374151] border-[#E2E6EA] hover:border-[#C0181A] font-medium'
                  }`}
                >
                  <span className="text-sm sm:text-base font-black">{item.label}</span>
                  <span className={`text-[11px] mt-0.5 ${position === item.pos ? 'text-white/80' : 'text-[#6B7280]'}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#E2E6EA]">
              <span className="text-xs font-semibold text-[#1E293B]">
                Active Position: <strong className="text-[#C0181A] font-black">{position === 1 ? 'First Slide' : 'Last Slide'}</strong>
              </span>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#C0181A] hover:bg-[#A01416] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                {saving ? 'Saving Placement...' : 'Save Placement & Changes'}
              </button>
            </div>
          </div>




          {/* Headline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              Headline *
            </label>
            <input
              type="text"
              placeholder="e.g. Your Business Deserves Better Software."
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors"
              required
            />
          </div>

          {/* Subheadline */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              Subheadline
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Custom websites, web apps, mobile apps & AI automation built to grow your business."
              value={subheadline}
              onChange={(e) => setSubheadline(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors resize-none"
            />
          </div>

          {/* Banner Image URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              Banner Graphic / Image Path
            </label>
            <input
              type="text"
              placeholder="e.g. /Screenshot 2026-08-03 175540.png"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors"
            />
          </div>

          {/* CTA Button Text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              CTA Button Text
            </label>
            <input
              type="text"
              placeholder="e.g. Book a Free Consultation"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors"
            />
          </div>

          {/* CTA Link */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              CTA Target Link / URL
            </label>
            <input
              type="text"
              placeholder="e.g. https://wa.me/123456789 or https://growlic.com"
              value={ctaLink}
              onChange={(e) => setCtaLink(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors"
            />
          </div>

          {/* Badge Text */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              Badge Tagline
            </label>
            <input
              type="text"
              placeholder="e.g. SOFTWARE & DIGITAL SOLUTIONS"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              className="bg-[#F5F5F5] border border-transparent focus:border-[#C0181A] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Right Column: Styling & Color Customization */}
        <div className="w-full lg:w-[380px] bg-white border border-[#E2E6EA] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="border-b border-[#E2E6EA] pb-3">
            <h2 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#C0181A]" /> Theme & Color Styling
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Select gradient presets or pick custom hex colors.
            </p>
          </div>

          {/* Color Presets */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Preset Themes
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#E2E6EA] hover:border-[#C0181A] text-left transition-all text-xs font-medium bg-[#F8FAFC]"
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                    }}
                  />
                  <span className="truncate text-[#1E293B]">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="flex flex-col gap-3 pt-2">
            <label className="text-xs font-bold uppercase text-[#8B0000] tracking-wider">
              Custom Colors
            </label>

            {/* Gradient Start */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#374151]">Gradient Start Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColorFrom}
                  onChange={(e) => setBgColorFrom(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#E2E6EA]"
                />
                <input
                  type="text"
                  value={bgColorFrom}
                  onChange={(e) => setBgColorFrom(e.target.value)}
                  className="w-20 text-xs font-mono px-2 py-1 bg-[#F5F5F5] rounded border border-transparent focus:border-[#C0181A] outline-none"
                />
              </div>
            </div>

            {/* Gradient End */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#374151]">Gradient End Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColorTo}
                  onChange={(e) => setBgColorTo(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#E2E6EA]"
                />
                <input
                  type="text"
                  value={bgColorTo}
                  onChange={(e) => setBgColorTo(e.target.value)}
                  className="w-20 text-xs font-mono px-2 py-1 bg-[#F5F5F5] rounded border border-transparent focus:border-[#C0181A] outline-none"
                />
              </div>
            </div>

            {/* Text Color */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#374151]">Heading & Copy Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#E2E6EA]"
                />
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-20 text-xs font-mono px-2 py-1 bg-[#F5F5F5] rounded border border-transparent focus:border-[#C0181A] outline-none"
                />
              </div>
            </div>

            {/* CTA Button BG */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#374151]">CTA Button Background</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={ctaBgColor}
                  onChange={(e) => setCtaBgColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#E2E6EA]"
                />
                <input
                  type="text"
                  value={ctaBgColor}
                  onChange={(e) => setCtaBgColor(e.target.value)}
                  className="w-20 text-xs font-mono px-2 py-1 bg-[#F5F5F5] rounded border border-transparent focus:border-[#C0181A] outline-none"
                />
              </div>
            </div>

            {/* CTA Button Text Color */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#374151]">CTA Button Text Color</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={ctaTextColor}
                  onChange={(e) => setCtaTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-[#E2E6EA]"
                />
                <input
                  type="text"
                  value={ctaTextColor}
                  onChange={(e) => setCtaTextColor(e.target.value)}
                  className="w-20 text-xs font-mono px-2 py-1 bg-[#F5F5F5] rounded border border-transparent focus:border-[#C0181A] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#E2E6EA]">
            <AdminButton
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-[#C0181A] hover:bg-[#A01416] text-white font-bold py-3 rounded-xl shadow-md transition-colors"
            >
              <Zap className="w-4 h-4" />
              {saving ? 'Saving Changes...' : 'Save Developer Promo Banner'}
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}
