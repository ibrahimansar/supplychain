import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { treeAPI } from '../services/api';

/**
 * What a relative sees when someone asks them what they know.
 *
 * No account, no navigation, no tree. One question at a time, because the
 * people most worth asking are often answering on a phone they did not choose
 * and will abandon a form that looks like work. Everything they leave becomes a
 * proposal for an admin to review — nothing here writes to the tree.
 *
 * Deliberately self-contained and always light, like the landing page: it is
 * seen by people who have never used the product and have no theme set.
 */

const Field = ({ question, value, onChange, autoFocus }) => {
  const base =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 ' +
    'placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20';

  if (question.type === 'TEXTAREA') {
    return (
      <textarea
        id={question.key} rows={5} className={base} value={value}
        autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)}
        placeholder="Type whatever you remember"
      />
    );
  }
  if (question.type === 'SELECT') {
    return (
      <select id={question.key} className={base} value={value} autoFocus={autoFocus}
              onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(question.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (question.type === 'CHECKBOX') {
    return (
      <label className="flex items-center gap-3 text-base text-slate-800">
        <input
          type="checkbox" id={question.key} checked={value === 'true'} autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.checked ? 'true' : '')}
          className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        Yes
      </label>
    );
  }
  return (
    <input
      id={question.key}
      // Year questions are free text on purpose: "around 1890" is a real answer
      // and a number input would reject it.
      type={question.type === 'DATE' ? 'date' : 'text'}
      inputMode={question.type === 'NUMBER' ? 'numeric' : undefined}
      className={base} value={value} autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.type === 'NUMBER' ? 'An approximate year is fine' : ''}
    />
  );
};

export default function ContributePage() {
  const { token } = useParams();
  const [page, setPage] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let active = true;
    treeAPI.getContributePage(token)
      .then((res) => { if (active) setPage(res.data); })
      .catch((e) => {
        if (!active) return;
        const status = e?.response?.status;
        setLoadError(status === 410 ? 'expired' : 'notfound');
      });
    return () => { active = false; };
  }, [token]);

  const questions = page?.questions || [];
  // The name step is last: asking who someone is before they have answered
  // anything reads as a sign-up, which is what this exists to avoid.
  const totalSteps = questions.length + 1;
  const answered = useMemo(
    () => Object.values(answers).filter((v) => String(v || '').trim() !== '').length,
    [answers],
  );

  const submit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        contributorName: name.trim() || null,
        answers: Object.entries(answers)
          .filter(([, v]) => String(v || '').trim() !== '')
          .map(([key, value]) => ({ key, value: String(value) })),
      };
      const res = await treeAPI.submitContribution(token, payload);
      setDone(res?.data?.received ?? payload.answers.length);
    } catch (e) {
      setSubmitError(
        e?.response?.status === 410
          ? 'This link has been closed.'
          : e?.response?.data?.message || 'Could not send your answers. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const Shell = ({ children }) => (
    <div className="min-h-screen bg-slate-50 px-5 py-10" dir="auto">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );

  if (loadError) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            {loadError === 'expired' ? 'This link has been closed' : 'This link was not found'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {loadError === 'expired'
              ? 'Whoever sent it can send you a new one.'
              : 'Check the link, or ask whoever sent it for a fresh one.'}
          </p>
        </div>
      </Shell>
    );
  }

  if (!page) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (done !== null) {
    return (
      <Shell>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
            <Check className="h-6 w-6 text-teal-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Thank you</h1>
          <p className="mt-2 text-sm text-slate-600">
            {done === 1 ? 'Your answer has' : `Your ${done} answers have`} been sent to the family.
            Someone will look over {done === 1 ? 'it' : 'them'} before {done === 1 ? 'it is' : 'they are'} added.
          </p>
          <p className="mt-4 text-xs text-slate-400">You can close this page.</p>
        </div>
      </Shell>
    );
  }

  const onNameStep = step >= questions.length;
  const q = questions[step];

  return (
    <Shell>
      <div className="mb-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{page.treeName}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{page.personName}</h1>
        {page.personContext && <p className="mt-0.5 text-sm text-slate-500">{page.personContext}</p>}
        <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600">
          {page.label || 'A relative is building your family tree and would like what you remember.'}
        </p>
      </div>

      {/* Progress, so a long list does not feel open-ended. */}
      <div className="mb-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-teal-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {onNameStep ? (
          <>
            <label htmlFor="contributor" className="block text-lg font-semibold text-slate-900">
              Who should we thank?
            </label>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              Optional. It is recorded alongside your answers so the family knows who remembered this.
            </p>
            <input
              id="contributor" type="text" value={name} autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
          </>
        ) : (
          <>
            <label htmlFor={q.key} className="block text-lg font-semibold text-slate-900">
              {q.label}
            </label>
            {q.help && <p className="mt-1 mb-4 text-sm text-slate-500">{q.help}</p>}
            {!q.help && <div className="mb-4" />}
            <Field
              question={q}
              value={answers[q.key] || ''}
              autoFocus
              onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))}
            />
            {q.currentValue && (
              <p className="mt-2 text-xs text-slate-400">
                Currently recorded as “{q.currentValue}”. Correct it if you know better.
              </p>
            )}
          </>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {onNameStep ? (
            <button
              type="button" onClick={submit} disabled={submitting || answered === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Send {answered > 0 ? `${answered} answer${answered === 1 ? '' : 's'}` : ''}
            </button>
          ) : (
            <button
              type="button" onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {String(answers[q.key] || '').trim() ? 'Next' : 'Skip'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Nothing you write appears in the tree until a family member reviews it.
      </p>
    </Shell>
  );
}
