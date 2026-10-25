import React, { useEffect, useState } from 'react';
import Button from './ui/Button';
import { X, ChevronLeft, ChevronRight, Check, TreePine, Edit3, UserPlus, Move, Shield } from 'lucide-react';

/** Simple illustrative “snapshots” — fixed scenes, not live DOM anchors. */
const Illustrations = {
  welcome: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f8fafc" rx="12" />
      <rect x="132" y="18" width="56" height="36" rx="8" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      <line x1="160" y1="54" x2="160" y2="78" stroke="#94a3b8" strokeWidth="2" />
      <line x1="80" y1="78" x2="240" y2="78" stroke="#94a3b8" strokeWidth="2" />
      <line x1="80" y1="78" x2="80" y2="96" stroke="#94a3b8" strokeWidth="2" />
      <line x1="160" y1="78" x2="160" y2="96" stroke="#94a3b8" strokeWidth="2" />
      <line x1="240" y1="78" x2="240" y2="96" stroke="#94a3b8" strokeWidth="2" />
      <rect x="52" y="96" width="56" height="36" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <rect x="132" y="96" width="56" height="36" rx="8" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="2" />
      <rect x="212" y="96" width="56" height="36" rx="8" fill="#fce7f3" stroke="#ec4899" strokeWidth="2" />
      <text x="160" y="160" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">Your family tree</text>
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f8fafc" rx="12" />
      <rect x="110" y="48" width="100" height="70" rx="10" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <text x="160" y="80" textAnchor="middle" fill="#0f172a" fontSize="13" fontFamily="system-ui" fontWeight="600">Family Head</text>
      <text x="160" y="98" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="system-ui">Edit details here</text>
      <circle cx="198" cy="42" r="14" fill="#0f766e" />
      <path d="M192 42 h12 M198 36 v12" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <text x="160" y="150" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">Hover a node → pencil icon</text>
    </svg>
  ),
  add: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f8fafc" rx="12" />
      <rect x="120" y="36" width="80" height="48" rx="8" fill="#dbeafe" stroke="#3b82f6" strokeWidth="2" />
      <circle cx="188" cy="88" r="16" fill="#0f766e" />
      <path d="M188 80 v16 M180 88 h16" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="160" y1="84" x2="160" y2="118" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="90" y="118" width="60" height="36" rx="7" fill="#ede9fe" stroke="#8b5cf6" strokeWidth="1.5" />
      <rect x="170" y="118" width="60" height="36" rx="7" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5" />
      <text x="160" y="168" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">+ adds children or spouses</text>
    </svg>
  ),
  navigate: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f8fafc" rx="12" />
      <rect x="40" y="40" width="200" height="110" rx="10" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
      <rect x="70" y="60" width="40" height="24" rx="5" fill="#bfdbfe" />
      <rect x="130" y="90" width="40" height="24" rx="5" fill="#ddd6fe" />
      <rect x="190" y="70" width="40" height="24" rx="5" fill="#fbcfe8" />
      <path d="M250 70 l20 20 -20 20" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M250 90 h28" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
      <text x="160" y="168" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">Drag to pan · scroll to zoom</text>
    </svg>
  ),
  share: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f8fafc" rx="12" />
      <rect x="60" y="40" width="200" height="88" rx="10" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <rect x="76" y="56" width="100" height="10" rx="3" fill="#e2e8f0" />
      <rect x="76" y="74" width="148" height="10" rx="3" fill="#ccfbf1" />
      <rect x="76" y="92" width="80" height="20" rx="6" fill="#0f766e" />
      <text x="116" y="106" textAnchor="middle" fill="#fff" fontSize="10" fontFamily="system-ui">Invite</text>
      <text x="160" y="155" textAnchor="middle" fill="#64748b" fontSize="12" fontFamily="system-ui">Admin → Members & Viewer links</text>
    </svg>
  ),
  intro: (
    <svg viewBox="0 0 320 180" className="w-full h-full" aria-hidden="true">
      <rect width="320" height="180" fill="#f0fdfa" rx="12" />
      <circle cx="160" cy="72" r="36" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2" />
      <path d="M148 72 l8 8 16 -16" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="160" y="130" textAnchor="middle" fill="#0f172a" fontSize="14" fontFamily="system-ui" fontWeight="600">Ready to begin</text>
      <text x="160" y="150" textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="system-ui">Private trees · dual names · roles</text>
    </svg>
  ),
};

export const TREE_TOUR_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to your family tree',
    body: 'This workspace is where you build and explore lineage. Use the slides below for a quick walkthrough — nothing here points at live nodes, so the tour stays steady.',
    illustration: 'welcome',
    icon: TreePine,
  },
  {
    id: 'edit',
    title: 'Edit a person',
    body: 'Hover any person card to reveal the pencil. Update names, dates, and notes. Start with the root person if the tree is new.',
    illustration: 'edit',
    icon: Edit3,
  },
  {
    id: 'add',
    title: 'Add family members',
    body: 'Use the + control on a person to add a child, parent, or spouse. Spouse options live inside that flow — including linking by person ID across trees you manage.',
    illustration: 'add',
    icon: UserPlus,
  },
  {
    id: 'navigate',
    title: 'Navigate the canvas',
    body: 'Drag the background to pan. Scroll or use the zoom controls to zoom. Double-click a person with descendants to collapse or expand their branch.',
    illustration: 'navigate',
    icon: Move,
  },
  {
    id: 'admin',
    title: 'Share with family',
    body: 'Open Admin to invite members with roles, create private viewer links, and manage connections. Viewers never see editing tools.',
    illustration: 'share',
    icon: Shield,
  },
];

export const INTRO_TOUR_SLIDES = [
  {
    id: 'intro-welcome',
    title: 'Welcome to NasabLink',
    body: 'NasabLink helps you record lineage with care — Arabic/RTL names, private sharing, and clear family roles.',
    illustration: 'intro',
    icon: TreePine,
  },
  {
    id: 'intro-tree',
    title: 'Build your tree',
    body: 'Create a tree, edit the root person, then grow the lineage with children, parents, and spouses from each card.',
    illustration: 'welcome',
    icon: Edit3,
  },
  {
    id: 'intro-add',
    title: 'Grow generation by generation',
    body: 'Add relatives from any person. Collapse busy branches when the tree gets large, and focus search on someone to highlight their path.',
    illustration: 'add',
    icon: UserPlus,
  },
  {
    id: 'intro-share',
    title: 'Invite and keep it private',
    body: 'Share with Admin, Verifier, or Viewer roles, or send an expiring viewer link. Your tree stays private unless you choose otherwise.',
    illustration: 'share',
    icon: Shield,
  },
];

/**
 * Fixed slide-based product tour. No DOM targeting — popups never chase tree nodes.
 */
export default function ProductTour({
  isOpen,
  onClose,
  onSkip,
  slides = TREE_TOUR_SLIDES,
  title = 'Product tour',
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') (onSkip || onClose)?.();
      if (e.key === 'ArrowRight' && step < slides.length - 1) setStep((s) => s + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, step, slides.length, onClose, onSkip]);

  if (!isOpen || !slides.length) return null;

  const slide = slides[step];
  const Icon = slide.icon || TreePine;
  const art = Illustrations[slide.illustration] || Illustrations.welcome;
  const isLast = step === slides.length - 1;

  const finish = () => (onSkip || onClose)?.();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-tour-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) finish();
      }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold truncate">{title}</p>
              <p className="text-xs text-slate-500">
                Slide {step + 1} of {slides.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={finish}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-5 mt-1 mb-4 h-44 rounded-xl overflow-hidden border border-slate-100 dark:border-gray-800 bg-slate-50">
          {art}
        </div>

        <div className="px-5 pb-2">
          <h2 id="product-tour-title" className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {slide.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {slide.body}
          </p>
        </div>

        <div className="px-5 pt-3 pb-2">
          <div className="flex gap-1.5 justify-center">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-teal-700' : 'w-1.5 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-5 py-4 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-gray-800">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            {!isLast ? (
              <Button variant="solid" size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1">
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button variant="solid" size="sm" onClick={finish} className="gap-1">
                <Check className="h-3.5 w-3.5" />
                Got it
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
