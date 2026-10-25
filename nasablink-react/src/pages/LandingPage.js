import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/Logo';
import {
  ArrowRight, Check, Globe, Users, Share2, Link2, FileCheck,
  Shield, Download, Languages, Layers, Sparkles, Clock, GitBranch,
  ScanSearch, HelpCircle, Lock, Smartphone, Crown, MapPin,
  SlidersHorizontal, Plus, Type, Hash, List as ListIcon, ToggleLeft,
  MessageCircle, Inbox,
} from 'lucide-react';

/**
 * Marketing landing page.
 *
 * Deliberately self-contained and always light: it renders no Navbar (App.js
 * hides it on "/") and does not use `dark:` variants, so it looks identical
 * regardless of the app's theme setting and cannot be broken by it. That is
 * why it is allowlisted in scripts/contrast-check.js.
 */

const EASE = [0.22, 1, 0.36, 1];

/** Reveal-on-scroll that respects prefers-reduced-motion. */
function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
      <span className="h-1 w-1 rounded-full bg-teal-600" />
      {children}
    </div>
  );
}

function Section({ id, children, className = '' }) {
  return (
    <section id={id} className={`relative px-5 sm:px-8 py-20 sm:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, children, accent = 'teal' }) {
  const ring = accent === 'amber' ? 'text-amber-700 bg-amber-100' : 'text-teal-700 bg-teal-100';
  return (
    <div className="group relative rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50">
      <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${ring}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-slate-900">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-600">{children}</p>
    </div>
  );
}

/**
 * Hand-built tree visual. Not React Flow: this needs to be decorative, light
 * and fully controllable, not an interactive canvas.
 */
function TreePreview() {
  const node = (x, y, name, meta, highlight) => (
    <g key={`${x}-${y}`} transform={`translate(${x},${y})`}>
      <rect
        x="-62" y="-22" width="124" height="44" rx="11"
        className={highlight ? 'fill-teal-50 stroke-teal-400' : 'fill-white stroke-slate-300'}
        strokeWidth="1"
      />
      <text x="0" y="-3" textAnchor="middle" className="fill-slate-900" style={{ fontSize: 11, fontWeight: 600 }}>
        {name}
      </text>
      <text x="0" y="12" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 10 }}>
        {meta}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 680 330" className="w-full" role="img" aria-label="A family tree spanning four generations">
      <defs>
        <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(13,148,136)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="rgb(13,148,136)" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* edges drawn first so nodes sit on top */}
      <g stroke="url(#edge)" strokeWidth="1.5" fill="none">
        <path d="M340,52 L340,92 L170,92 L170,128" />
        <path d="M340,52 L340,128" />
        <path d="M340,52 L340,92 L510,92 L510,128" />
        <path d="M170,172 L170,212 L90,212 L90,248" />
        <path d="M170,172 L170,212 L250,212 L250,248" />
        <path d="M510,172 L510,212 L430,212 L430,248" />
        <path d="M510,172 L510,212 L590,212 L590,248" />
      </g>

      {node(340, 30, 'Ibrahim', '1890–1961', true)}
      {node(170, 150, 'Sadaqathullah', '1920–1998')}
      {node(340, 150, 'Fatima', '1924–2003')}
      {node(510, 150, 'Aisha', '1927–2011')}
      {node(90, 270, 'Yusuf', 'b. 1952')}
      {node(250, 270, 'Maryam', 'b. 1955')}
      {node(430, 270, 'Omar', 'b. 1958')}
      {node(590, 270, 'Layla', 'b. 1961')}
    </svg>
  );
}

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Ask relatives who will never sign up',
    body: 'Send an aunt a link. She answers a few questions on her phone — no account, no app — and you review every answer before it reaches the tree.',
  },
  {
    icon: SlidersHorizontal,
    title: 'A person form you design',
    body: 'Add the fields your records actually need — house name, migration year, burial place, source confidence — and they appear on every person form in your tree.',
  },
  {
    icon: Layers,
    title: 'Four tree layouts',
    body: 'Vertical, horizontal, alternating by generation, or dynamic — choose per parent. Deep lineages and wide families each get a shape that fits.',
  },
  {
    icon: Languages,
    title: 'Two scripts, one person',
    body: 'Every person can carry their name in two scripts at once, both shown on the node. Right-to-left layouts are first-class, not a translated left-to-right page.',
  },
  {
    icon: GitBranch,
    title: 'Relationships as they really are',
    body: 'Biological, step, adoptive and guardianship are distinct relationship types, drawn differently on the tree rather than flattened into one line.',
  },
  {
    icon: Users,
    title: 'Everyone contributes at once',
    body: 'Your cousin in Dubai and your uncle in Chennai edit the same tree, live. No files to email, no versions to merge.',
  },
  {
    icon: Shield,
    title: 'Roles that match families',
    body: 'Owner, admin, verifier and viewer. Join requests go through an approval step, so access is granted deliberately.',
  },
  {
    icon: Share2,
    title: 'Share without giving access',
    body: 'Read-only links that expire, cap their number of uses, and can be revoked — for relatives who should see the tree but not edit it.',
  },
  {
    icon: Link2,
    title: 'Cross-tree person linking',
    body: 'The same ancestor appears in two families? Link them. Two trees stay separate but acknowledge where they meet.',
  },
  {
    icon: Globe,
    title: 'Public discovery',
    body: 'Publish a tree and let relatives find it by region. The connection you have been missing may be searching for you.',
  },
  {
    icon: FileCheck,
    title: 'Evidence, attached to facts',
    body: 'Attach a birth certificate or a register entry to a specific field, not just the person — so a claim and its proof stay together.',
  },
  {
    icon: HelpCircle,
    title: 'Open research questions',
    body: '"Who was his grandfather?" becomes a tracked question any admin can answer, rather than knowledge lost in a chat thread.',
  },
  {
    icon: ScanSearch,
    title: 'Duplicate detection',
    body: 'When several relatives add the same person, NasabLink finds the likely duplicates so you can merge them.',
  },
  {
    icon: Clock,
    title: 'Timeline and statistics',
    body: 'Life events across generations on one timeline, with generation depth, branch sizes and distribution at a glance.',
  },
];

const PRIVACY = [
  {
    icon: Download,
    title: 'Leave whenever you want',
    body: 'Full GEDCOM import and export, plus JSON. Your tree opens in Ancestry, MyHeritage or Gramps. We are not a one-way door.',
  },
  {
    icon: Lock,
    title: 'Living people stay private',
    body: 'Anyone without a death year is treated as possibly living and is hidden from public and shared views by default.',
  },
  {
    icon: Shield,
    title: 'Real GDPR controls',
    body: 'Export everything, request deletion, manage consent. Not a policy page — actual buttons that do the thing.',
  },
  {
    icon: Smartphone,
    title: 'Works on the phone in your pocket',
    body: 'Installable, works offline, and built mobile-first — because most of the family will only ever open it on a phone.',
  },
];

const STEPS = [
  { n: '01', t: 'Start with one name', d: 'Add yourself, or the oldest ancestor you know. One person is a tree.' },
  { n: '02', t: 'Or bring what you have', d: 'Import a GEDCOM from any other service and the whole family arrives at once.' },
  { n: '03', t: 'Invite the people who remember', d: 'Your aunt knows the names you do not. Give her an admin seat and let her fill them in.' },
  { n: '04', t: 'Attach the proof', d: 'Certificates, register photographs, Quran flyleaf records — tied to the fact they support.' },
  { n: '05', t: 'Share it with everyone else', d: 'A read-only link for the family group. No accounts required to look.' },
  { n: '06', t: 'Keep it alive', d: 'Open questions, verification and new branches — a record that keeps growing after you.' },
];

const FAQS = [
  {
    q: 'Do I need to be technical?',
    a: 'No. Create a tree, add a person, and you are going. Most people have something worth showing the family within ten minutes.',
  },
  {
    q: 'Can I move my data out later?',
    a: 'Yes, at any time, on every plan including free. Full GEDCOM export is the genealogy standard and opens anywhere. Export is never a paid feature.',
  },
  {
    q: 'Who can see my family tree?',
    a: 'Nobody, unless you decide otherwise. Trees are private by default. You can share a read-only link, or publish to Explore — both are deliberate choices.',
  },
  {
    q: 'Does it handle right-to-left scripts properly?',
    a: 'Yes. The interface mirrors fully for right-to-left languages, and a person can hold their name in two scripts at the same time, both visible on the tree.',
  },
  {
    q: 'My grandmother will never use an app. Can she still help?',
    a: 'Yes, and this is the part we care most about. Send her a link about one person. She answers a few plain questions on her phone — no account, no app, no password — and every answer waits for you to approve before it touches the tree.',
  },
  {
    q: 'My family records something unusual. Will it fit?',
    a: 'Almost certainly. Beyond the built-in details, an admin can add their own fields to the person form — short text, long text, numbers, dates, dropdowns and yes/no — and mark any of them required. They apply to everyone editing that tree.',
  },
  {
    q: 'What happens when my trial ends?',
    a: 'Nothing is deleted. Anything beyond the free limits stays exactly as it is and remains viewable and exportable — you simply cannot add beyond those limits until you subscribe.',
  },
];

export default function LandingPage() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-white" />;
  }
  if (authenticated) {
    return <Navigate to="/trees" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-700 antialiased overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">NasabLink</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
            <a href="#custom-fields" className="transition-colors hover:text-slate-900">Customise</a>
            <a href="#contribute" className="transition-colors hover:text-slate-900">Contribute</a>
            <a href="#how" className="transition-colors hover:text-slate-900">How it works</a>
            <a href="#plans" className="transition-colors hover:text-slate-900">Plans</a>
            <a href="#faq" className="transition-colors hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/explore" className="hidden rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:text-slate-900 sm:block">
              Explore
            </Link>
            <Link
              to="/login"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        {/* glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/3 rounded-full blur-[110px]"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.14) 0%, rgba(20,184,166,0) 68%)' }}
        />
        <div className="relative mx-auto w-full max-w-5xl text-center">
          <Reveal>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
              <Sparkles className="h-3 w-3" />
              Family history, kept together
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <h1 className="text-[2.6rem] font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
              Your family remembers.
              <br />
              <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                Give it somewhere to live.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Build your family tree together with the relatives who hold the knowledge — across
              countries, in your own language, with the certificates and records that prove it.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-teal-700 sm:w-auto"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-[15px] font-medium text-slate-900 transition-colors hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
              >
                Explore public trees
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-500">
              {['Free plan, no card', '3 months of Plus free', 'Export anytime'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-teal-600" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* product visual */}
        <Reveal delay={0.25} className="relative mx-auto mt-16 w-full max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-white p-2 shadow-xl shadow-slate-200/60">
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-10">
              <TreePreview />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Who it is for ───────────────────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-slate-50 px-5 py-7 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Built for</span>
          {['Families spread across countries', 'Lineage and descendant records', 'Village and parish archives', 'Community and local historians'].map((t) => (
            <span key={t} className="text-slate-600">{t}</span>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <Section id="features">
        <Reveal>
          <Eyebrow>Features</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Everything a family history actually needs.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Most tools were built for one researcher working alone on Western records. This one was
            built for a family working together on names that were never written down.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={Math.min(i * 0.04, 0.3)}>
              <FeatureCard icon={f.icon} title={f.title}>{f.body}</FeatureCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Contribution links: the knowledge is in people ─────────────── */}
      <Section id="contribute" className="border-y border-slate-200 bg-slate-50">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Ask the people who remember</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              The person who knows<br className="hidden sm:block" /> will never sign up.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              Most of what is missing from a family tree sits in the memory of one
              elderly relative. Ask them to create an account, learn an interface
              and find the right person to edit, and the answer stays where it is.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              So don’t. Send them <span className="font-medium text-slate-900">one link about
              one person</span>. They answer a few plain questions on their phone and send
              them back. No account, no app, no password.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                ['Questions write themselves', 'Drawn from what the record is missing, plus the fields you added to your own form'],
                ['Nothing lands unreviewed', 'Every answer waits in a queue showing who said it and what it would replace'],
                ['Scoped to one person', 'A link sent to one relative is never a way to browse the rest of the family'],
                ['Close it whenever', 'Revoke instantly, or set it to expire on its own'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
                  <span className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{t}</span>
                    <span className="text-slate-500"> — {d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-4">
              {/* What the relative sees */}
              <div className="mx-auto w-full max-w-[18rem] rounded-[2rem] border-8 border-slate-900 bg-white p-5 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                    Ansari Family
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">Ibrahim</p>
                  <p className="text-[11px] text-slate-500">b. 1890</p>
                </div>
                <div className="mt-4 flex gap-1" aria-hidden="true">
                  <span className="h-1 flex-1 rounded-full bg-teal-500" />
                  <span className="h-1 flex-1 rounded-full bg-teal-500" />
                  <span className="h-1 flex-1 rounded-full bg-slate-200" />
                  <span className="h-1 flex-1 rounded-full bg-slate-200" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-900">Where were they from?</p>
                <p className="text-[11px] text-slate-500">A village, town or region.</p>
                <div className="mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800">
                  Palayam
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white">
                    Next <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>

              {/* What you see */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  <Inbox className="h-3.5 w-3.5" /> Waiting for your review
                </div>
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-100 px-3 py-2 text-xs">
                    <span className="font-medium text-slate-900">Aunt Fatima</span>
                    <span className="text-slate-500"> on Ibrahim · 2 answers</span>
                  </div>
                  {[['Where were they from?', 'Palayam'], ['House name', 'Dar al-Qamar']].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="min-w-0">
                        <span className="block text-[10px] text-slate-500">{k}</span>
                        <span className="block text-xs text-slate-900">{v}</span>
                      </span>
                      <span className="flex gap-1">
                        <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">Discard</span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">Accept</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Custom fields: the form is yours ───────────────────────────── */}
      <Section id="custom-fields">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Your records, your fields</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              No two families record<br className="hidden sm:block" /> the same things.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              One family tracks the village each branch left and the year they left it. Another
              tracks burial places. A research project tracks how confident it is in every claim.
              Genealogy software usually answers this with a <span className="font-medium text-slate-900">notes
              box</span> — one blob of text nobody can search, sort or trust.
            </p>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              In NasabLink, an admin opens the form builder and adds the fields their records
              need. They appear on every Add and Edit person form in that tree, for everyone,
              immediately.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                ['Six field types', 'Short text, long text, number, date, dropdown and yes/no'],
                ['Required when it matters', 'Mark a field required and no person can be saved without it'],
                ['Reorder and retire', 'Move fields into the order you ask them in; hide one without losing what it already holds'],
                ['Per tree, not per account', 'Each tree you run can ask for something different'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
                  <span className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{t}</span>
                    <span className="text-slate-500"> — {d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-4">
              {/* Builder */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    <SlidersHorizontal className="h-3.5 w-3.5" /> Form builder
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2 py-1 text-[11px] font-semibold text-white">
                    <Plus className="h-3 w-3" /> Add field
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    [Type, 'House name', 'Short text', false],
                    [Hash, 'Migration year', 'Number', false],
                    [ListIcon, 'Branch', 'Dropdown · North, South, Coastal', true],
                    [ToggleLeft, 'Verified in person', 'Yes / No', false],
                  ].map(([Icon, label, meta, required]) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{label}</span>
                          {required && (
                            <span className="flex-shrink-0 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                              Required
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{meta}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resulting form */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  … and the person form becomes
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">House name</div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                      Dar al-Qamar
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs font-medium text-slate-600">
                      Branch <span className="text-rose-500">*</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
                      Coastal
                      <span className="text-slate-400">▾</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── Structured names: built in, for the families that need them ── */}
      <Section className="border-y border-slate-200 bg-slate-50">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Names, properly</Eyebrow>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              A name is not one field.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              In many naming traditions a full name carries <span className="font-medium text-slate-900">a
              title, a chain of ancestors, a family or house name and a place of origin</span>.
              Most genealogy software squeezes all of it into one text box and loses the structure
              that gave it meaning. These parts are built in — no setup required.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                ['Honorific and epithet', 'Titles kept as their own field, not buried in the name'],
                ['Ancestor chain', 'Lineage recorded as structure, not prose'],
                ['Family or house name', 'The name the wider family is known by, as its own field'],
                ['Place of origin', 'The village five generations called home'],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
                  <span className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">{t}</span>
                    <span className="text-slate-500"> — {d}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                <MapPin className="h-3.5 w-3.5" /> Person record
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Name</div>
                  <div className="mt-1 flex items-baseline justify-between gap-4">
                    <span className="text-lg font-semibold text-slate-900">Sadaqathullah</span>
                    <span className="text-sm text-teal-700">second script</span>
                  </div>
                </div>
                {[
                  ['Honorific', 'Elder'],
                  ['Ancestor chain', 'son of Ibrahim'],
                  ['Family name', 'Palayami'],
                  ['Place of origin', 'Palayam'],
                  ['Relationship to parent', 'Biological'],
                  ['House name', 'Dar al-Qamar', true],
                ].map(([k, v, custom]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs text-slate-500">{k}</span>
                      {custom && (
                        <span className="flex-shrink-0 rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                          your field
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-slate-800">{v}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-teal-700">
                  <FileCheck className="h-3.5 w-3.5" />
                  2 sources attached
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <Section id="how">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            From one remembered name to a family archive.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={Math.min(i * 0.05, 0.3)}>
              <div className="h-full bg-white p-7">
                <div className="mb-4 text-xs font-semibold tracking-widest text-teal-600/70">{s.n}</div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">{s.t}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Data ownership ──────────────────────────────────────────────── */}
      <Section className="border-y border-slate-200 bg-slate-50">
        <Reveal>
          <Eyebrow>Your data</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            It is your family. It stays yours.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            A genealogy you cannot get back out is not an archive, it is a hostage. Export is free,
            standard, and always available.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {PRIVACY.map((f, i) => (
            <Reveal key={f.title} delay={Math.min(i * 0.05, 0.25)}>
              <FeatureCard icon={f.icon} title={f.title} accent="amber">{f.body}</FeatureCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Plans ───────────────────────────────────────────────────────── */}
      <Section id="plans">
        <Reveal>
          <Eyebrow>Plans</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Start free. Try everything for three months.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
              <div className="text-sm font-medium text-slate-500">Free</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-slate-900">$0</span>
                <span className="text-sm text-slate-500">forever</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">Enough to build a real family tree.</p>
              <ul className="mt-7 space-y-3">
                {['3 family trees', 'Up to 200 people per tree', '2 admins and 200 viewers per tree',
                  'All four tree layouts', 'GEDCOM import and export', 'Multiple languages, LTR and RTL'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-8 block rounded-xl border border-slate-300 py-3 text-center text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50">
                Create a free account
              </Link>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="relative h-full overflow-hidden rounded-2xl border-2 border-teal-500 bg-gradient-to-b from-teal-50 to-white p-8 shadow-lg shadow-teal-100">
              <div className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                <Crown className="h-3 w-3" /> 3 months free
              </div>
              <div className="text-sm font-medium text-teal-700">Plus</div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-slate-900">$99.99</span>
                <span className="text-sm text-slate-500">/year</span>
              </div>
              <p className="mt-3 text-sm text-slate-600">For families documenting at real scale.</p>
              <ul className="mt-7 space-y-3">
                {['10 family trees', 'Up to 1,000 people per tree',
                  '10 admins, 10 verifiers and 500 viewers', '500 document uploads with citations',
                  'Advanced trees & governance', 'Priority support'].map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm text-slate-800">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />{t}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-8 block rounded-xl bg-teal-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-teal-700">
                Start my free trial
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">
                No card required. The trial ends on its own.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <Section id="faq" className="border-t border-slate-200">
        <Reveal>
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Answered honestly.
          </h2>
        </Reveal>

        <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i * 0.04, 0.2)}>
              <details className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-slate-900 marker:hidden">
                  {f.q}
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-5 py-24 sm:px-8 sm:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, rgba(20,184,166,0) 70%)' }}
        />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            The people who remember will not always be here.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600">
            Start with one name tonight. Ask your grandmother for the next one tomorrow.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 sm:w-auto"
            >
              Start your family tree
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-7 py-3.5 text-[15px] font-medium text-slate-900 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              See public trees first
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="text-sm font-semibold text-slate-900">NasabLink</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <Link to="/explore" className="transition-colors hover:text-slate-900">Explore</Link>
            <Link to="/help" className="transition-colors hover:text-slate-900">Help</Link>
            <Link to="/privacy" className="transition-colors hover:text-slate-900">Privacy</Link>
            <Link to="/terms" className="transition-colors hover:text-slate-900">Terms</Link>
            <a href="mailto:nasablink@misbahi.zohodesk.com" className="transition-colors hover:text-slate-900">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
