import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Download,
  Palette,
  Layout,
  Printer,
  Sparkles,
  ExternalLink,
  Star,
  Check,
} from 'lucide-react';
import { Business, QRSettings } from '../../types';
import {
  generateQrPngDataUrl,
  generateQrSvgString,
  downloadDataUrl,
  downloadSvg,
} from '../../services/qr';
import { api } from '../../services/api';

interface QRStudioProps {
  businesses: Business[];
  selectedBusinessId?: string;
  onSelectBusiness?: (id: string) => void;
}

export const QRStudio: React.FC<QRStudioProps> = ({
  businesses,
  selectedBusinessId,
  onSelectBusiness,
}) => {
  const currentBusiness =
    businesses.find((b) => b.id === selectedBusinessId) || businesses[0];

  const [fgColor, setFgColor] = useState<string>('#1e1b4b');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [style, setStyle] = useState<'modern-card' | 'table-standee' | 'minimal'>('modern-card');
  const [customCta, setCustomCta] = useState<string>('Scan to Review Us on Google!');
  const [showLogo, setShowLogo] = useState<boolean>(true);

  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load existing QR settings for current business
  useEffect(() => {
    if (!currentBusiness) return;
    api.getQrSettings(currentBusiness.id).then((settings: QRSettings) => {
      if (settings) {
        if (settings.fgColor) setFgColor(settings.fgColor);
        if (settings.bgColor) setBgColor(settings.bgColor);
        if (settings.style) setStyle(settings.style as any);
        if (settings.customCta) setCustomCta(settings.customCta);
        setShowLogo(settings.showLogo ?? true);
      }
    });
  }, [currentBusiness?.id]);

  // Re-generate QR preview when business or color changes
  useEffect(() => {
    if (!currentBusiness) return;
    const reviewUrl = `${window.location.origin}/#b/${currentBusiness.slug}`;

    setIsGenerating(true);
    Promise.all([
      generateQrPngDataUrl({ text: reviewUrl, fgColor, bgColor, width: 400 }),
      generateQrSvgString({ text: reviewUrl, fgColor, bgColor, width: 400 }),
    ])
      .then(([png, svg]) => {
        setPngDataUrl(png);
        setSvgString(svg);
      })
      .finally(() => setIsGenerating(false));
  }, [currentBusiness?.id, fgColor, bgColor]);

  const handleDownloadPng = () => {
    if (!pngDataUrl || !currentBusiness) return;
    downloadDataUrl(pngDataUrl, `${currentBusiness.slug}-qr.png`);
  };

  const handleDownloadSvg = () => {
    if (!svgString || !currentBusiness) return;
    downloadSvg(svgString, `${currentBusiness.slug}-qr.svg`);
  };

  const handleSaveSettings = async () => {
    if (!currentBusiness) return;
    await api.updateQrSettings(currentBusiness.id, {
      fgColor,
      bgColor,
      style,
      customCta,
      showLogo,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!currentBusiness) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500">Please add a business first to customize its QR code.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-purple-600" />
            <span>QR Code Studio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Design high-resolution printable table standees and counter cards connected to your Google Review page.
          </p>
        </div>

        {/* Business Selector */}
        {businesses.length > 1 && onSelectBusiness && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Business:</span>
            <select
              value={currentBusiness.id}
              onChange={(e) => onSelectBusiness(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-purple-500"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Customization Controls */}
        <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-5 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-600" />
            <span>Styling & Display Options</span>
          </h3>

          {/* Style Templates */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Display Template</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'modern-card', label: 'Modern Frame' },
                { id: 'table-standee', label: 'Table Standee' },
                { id: 'minimal', label: 'Minimal QR' },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setStyle(tmpl.id as any)}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                    style === tmpl.id
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">QR Code Color</label>
              <div className="flex items-center gap-2 p-1.5 border border-slate-200 rounded-lg">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-slate-600">{fgColor}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Background Color</label>
              <div className="flex items-center gap-2 p-1.5 border border-slate-200 rounded-lg">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0"
                />
                <span className="text-xs font-mono text-slate-600">{bgColor}</span>
              </div>
            </div>
          </div>

          {/* CTA Text */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Call-To-Action Headline</label>
            <input
              type="text"
              value={customCta}
              onChange={(e) => setCustomCta(e.target.value)}
              placeholder="Scan to Review Us on Google!"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Show Logo toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-medium text-slate-700">Display Business Logo in header</span>
            <input
              type="checkbox"
              checked={showLogo}
              onChange={(e) => setShowLogo(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
            />
          </div>

          {/* Download & Save Buttons */}
          <div className="pt-3 space-y-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!pngDataUrl}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={!svgString}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SVG</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Standee</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Design</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Realistic Standee / Card Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-100/70 p-6 sm:p-10 rounded-2xl border border-slate-200">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Interactive Live Display Preview</span>
          </div>

          {/* Template Variant 1: Table Standee Card */}
          {style === 'table-standee' && (
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border-4 border-purple-900/10 p-7 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500" />

              {showLogo && currentBusiness.logoUrl && (
                <img
                  src={currentBusiness.logoUrl}
                  alt={currentBusiness.name}
                  className="w-14 h-14 mx-auto rounded-xl object-cover shadow-sm mb-3"
                />
              )}

              <h4 className="font-bold text-lg text-slate-900 leading-tight">{currentBusiness.name}</h4>
              <p className="text-xs text-purple-600 font-medium mt-0.5">
                {currentBusiness.customCategory || currentBusiness.category}
              </p>

              <div className="my-5 p-4 bg-slate-50 rounded-2xl inline-block border border-slate-100 shadow-inner">
                {pngDataUrl ? (
                  <img src={pngDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 bg-slate-200 animate-pulse" />
                )}
              </div>

              {/* 5 Stars Graphic */}
              <div className="flex justify-center items-center gap-1 text-amber-400 mb-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>

              <div className="font-bold text-sm text-slate-800">{customCta}</div>
              <div className="text-[10px] text-slate-400 mt-1">
                Scan with your phone camera • No app download required
              </div>
            </div>
          )}

          {/* Template Variant 2: Modern Card */}
          {style === 'modern-card' && (
            <div className="w-full max-w-sm bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white rounded-3xl shadow-2xl p-7 text-center relative">
              <div className="text-xs font-semibold tracking-widest uppercase text-purple-300 mb-1">
                Share Your Experience
              </div>
              <h4 className="font-bold text-xl text-white mb-4">{currentBusiness.name}</h4>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-lg mb-4">
                {pngDataUrl ? (
                  <img src={pngDataUrl} alt="QR Code" className="w-44 h-44 mx-auto" />
                ) : (
                  <div className="w-44 h-44 bg-slate-200 animate-pulse" />
                )}
              </div>

              <div className="font-bold text-sm text-purple-200">{customCta}</div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-2">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Google Verified Reviews</span>
              </div>
            </div>
          )}

          {/* Template Variant 3: Minimal QR */}
          {style === 'minimal' && (
            <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
              <div className="p-2 inline-block">
                {pngDataUrl ? (
                  <img src={pngDataUrl} alt="QR Code" className="w-52 h-52 mx-auto" />
                ) : (
                  <div className="w-52 h-52 bg-slate-200 animate-pulse" />
                )}
              </div>
              <div className="font-bold text-xs text-slate-800 mt-3">{currentBusiness.name}</div>
              <div className="text-[11px] text-slate-500 font-mono">/{currentBusiness.slug}</div>
            </div>
          )}

          <div className="text-center mt-4">
            <a
              href={`/#b/${currentBusiness.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-semibold"
            >
              <span>Test Public URL in new tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
