import React, { useMemo, useState, useContext } from 'react';
import useEntitlements from '../hooks/useEntitlements';
import { Crown } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../services/api';
import CustomPopup from '../components/ui/CustomPopup';
import { TreePine, Users, Globe, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import Logo from '../components/Logo';
import { useDataStore } from '../contexts/DataStoreContext';
import { DEFAULT_TEMPLATE_ID } from '../templates';

const OnboardingPage = () => {
  const { canCreateTree, loading: entitlementsLoading, treesUsed, treeLimit } = useEntitlements();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('My Family Tree');
  const [treeType, setTreeType] = useState('SIMPLE');
  const [loading, setLoading] = useState(false);
  const languages = useMemo(() => ([
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'ar', label: 'العربية', flag: '🇸🇦' },
  ]), []);
  const [primaryLang, setPrimaryLang] = useState('en');
  const [secondaryLang, setSecondaryLang] = useState('ar');

  const { user, fetchMe } = useContext(AuthContext);
  const { invalidateTrees } = useDataStore();
  const [popup, setPopup] = useState({ open: false, title: '', message: '', type: 'error' });

  const isPlusUser = user?.subscriptionStatus === 'PLUS';

  const createTree = async () => {
    setLoading(true);
    try {
      const res = await api.post('/trees', {
        name,
        treeType,
        templateId: DEFAULT_TEMPLATE_ID,
        primaryLang,
        secondaryLang,
      });
      const data = res.data || {};
      try {
        localStorage.setItem(
          `treeLang:${data.id}`,
          JSON.stringify({ primary: primaryLang, secondary: secondaryLang })
        );
      } catch (_) {}
      invalidateTrees();
      if (fetchMe) {
        await fetchMe();
      }
      navigate(`/trees/${data.id}`);
    } catch (e) {
      setPopup({
        open: true,
        title: 'Error',
        message: e?.response?.data?.message || 'Failed to create tree',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, title: 'Welcome', icon: TreePine },
    { id: 2, title: 'Name Your Tree', icon: TreePine },
    { id: 3, title: 'Choose Type', icon: Users },
    { id: 4, title: 'Languages', icon: Globe },
  ];

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Reachable by typing the URL even when the button that leads here is
  // disabled. Say so up front rather than letting someone name a tree and
  // choose a template before the server refuses at the final step.
  if (!entitlementsLoading && !canCreateTree) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            You have reached your tree limit
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {treesUsed != null && treeLimit != null
              ? `You have ${treesUsed} of ${treeLimit} trees on your current plan.`
              : 'Your current plan does not allow another tree.'}{' '}
            Every tree you already have stays fully usable.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/trees')}>Back to my trees</Button>
            <Button variant="solid" onClick={() => navigate('/subscription')}>See plans</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-surface-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              {steps.map((s, idx) => (
                <React.Fragment key={s.id}>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      step >= s.id
                        ? 'bg-primary-800 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-12 h-1 rounded transition-all ${
                        step > s.id ? 'bg-primary-800' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Step {step} of 4: {steps[step - 1].title}
            </p>
          </div>

          <Card className="p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-none">
            {step === 1 && (
              <div className="text-center">
                <Logo size={56} className="mx-auto mb-6" />
                <h1 className="font-display text-3xl font-bold mb-3 text-gray-900 dark:text-white">
                  Welcome to NasabLink
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
                  Create your first family tree in a few steps. You can rename it, change languages,
                  and invite relatives later.
                </p>

                <Button size="lg" onClick={nextStep}>
                  Get Started
                  <ArrowRight className="w-5 h-5 ms-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  Name Your Family Tree
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Give your tree a memorable name. Many families use their surname, like &quot;The Smith Family Tree&quot;.
                </p>

                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tree Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input mb-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-lg"
                  maxLength={120}
                  placeholder="e.g., The Johnson Family Tree"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {120 - name.length} characters remaining
                </p>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 bg-surface-50 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Tip:</strong> You can always change the name later from your tree settings.
                  </p>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 me-2" />
                    Back
                  </Button>
                  <Button onClick={nextStep} disabled={!name.trim()}>
                    Continue
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  Choose Your Tree Type
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select the type of tree that best fits your needs. You can upgrade later if needed.
                </p>

                <div className="space-y-3 mb-6">
                  <label
                    className={`flex items-start space-x-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      treeType === 'SIMPLE'
                        ? 'border-primary-700 bg-primary-50 dark:bg-primary-950/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="treeType"
                      value="SIMPLE"
                      checked={treeType === 'SIMPLE'}
                      onChange={(e) => setTreeType(e.target.value)}
                      className="mt-1 text-primary-700 focus:ring-primary-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Simple Tree</span>
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 text-xs rounded">
                          Free
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Perfect for most families. Includes all core features: family members, relationships,
                        collaboration, and sharing.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-4 p-4 border-2 rounded-xl transition-all ${
                      !isPlusUser
                        ? 'opacity-60 cursor-not-allowed border-gray-200 dark:border-gray-600'
                        : treeType === 'ADVANCED'
                          ? 'border-primary-700 bg-primary-50 dark:bg-primary-950/30 cursor-pointer'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="treeType"
                      value="ADVANCED"
                      checked={treeType === 'ADVANCED'}
                      onChange={(e) => setTreeType(e.target.value)}
                      disabled={!isPlusUser}
                      className="mt-1 text-primary-700 focus:ring-primary-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Advanced Tree</span>
                        <span className="px-2 py-0.5 text-[11px] font-medium tracking-wide rounded border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-600">
                          Plus
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Everything in Simple plus document storage, extended relationships, and advanced
                        collaboration features.
                      </p>
                      {!isPlusUser && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                          Upgrade to Plus to unlock Advanced trees
                        </p>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep}>
                    <ArrowLeft className="w-4 h-4 me-2" />
                    Back
                  </Button>
                  <Button onClick={nextStep}>
                    Continue
                    <ArrowRight className="w-4 h-4 ms-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                  Choose Languages
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select the primary and secondary languages for your family tree. This helps with name
                  display and search.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Primary Language
                    </label>
                    <select
                      className="form-input bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      value={primaryLang}
                      onChange={(e) => setPrimaryLang(e.target.value)}
                    >
                      {languages.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.flag} {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Secondary Language
                    </label>
                    <select
                      className="form-input bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                      value={secondaryLang}
                      onChange={(e) => setSecondaryLang(e.target.value)}
                    >
                      {languages
                        .filter((l) => l.value !== primaryLang)
                        .map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.flag} {l.label}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Alternative names and translations
                    </p>
                  </div>
                </div>

                <div className="bg-surface-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tree Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tree Type:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {treeType === 'SIMPLE' ? 'Simple' : 'Advanced'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Languages:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {languages.find((l) => l.value === primaryLang)?.label} /{' '}
                        {languages.find((l) => l.value === secondaryLang)?.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={prevStep} disabled={loading}>
                    <ArrowLeft className="w-4 h-4 me-2" />
                    Back
                  </Button>
                  <Button onClick={createTree} loading={loading} size="lg">
                    Create My Tree
                    <ArrowRight className="w-5 h-5 ms-2" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {step < 4 && (
            <div className="text-center mt-4">
              <button
                onClick={() => navigate('/trees')}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>

      <CustomPopup
        open={popup.open}
        onClose={() => setPopup((p) => ({ ...p, open: false }))}
        title={popup.title}
        message={popup.message}
        type={popup.type}
      />
    </>
  );
};

export default OnboardingPage;
