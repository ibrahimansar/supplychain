import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Logo from '../components/Logo';
import { ChevronDown, Search, Mail, MessageCircle, Book, Users, Shield, CreditCard, Share2, Settings } from 'lucide-react';

const easeOut = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

const faqCategories = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Book,
    faqs: [
      {
        question: 'What is NasabLink?',
        answer: 'NasabLink is a collaborative family tree platform that helps you create, manage, and share your family history. You can build multi-generation family trees, invite relatives to collaborate, store documents, and share your family story securely.'
      },
      {
        question: 'How do I create my first family tree?',
        answer: 'After signing in with your Google account, you\'ll be guided to create your first tree. Simply give it a name, choose a tree type (Simple or Advanced), and select your preferred languages. You can then start adding family members and building your tree.'
      },
      {
        question: 'Can I import an existing family tree?',
        answer: 'Yes. On Free and Plus, open Manage → Import GEDCOM and upload a .ged / .gedcom file. People are added into the current tree (subject to your plan’s people limit).'
      },
      {
        question: 'What\'s the difference between Simple and Advanced trees?',
        answer: 'Simple trees offer basic family tree functionality perfect for most users. Advanced trees (Plus plan only) include document storage, extended family relationships, and additional collaboration features for users managing comprehensive family archives.'
      }
    ]
  },
  {
    id: 'collaboration',
    name: 'Collaboration & Sharing',
    icon: Users,
    faqs: [
      {
        question: 'How do I invite family members to my tree?',
        answer: 'Go to your tree\'s Roles tab and click "Invite Member." Enter their email address and select their role (Admin, Verifier, or Viewer). They\'ll receive an invitation to join your tree.'
      },
      {
        question: 'What are the different roles in a family tree?',
        answer: 'There are three main roles: Admin (full control including member management), Verifier (can verify and approve changes), and Viewer (read-only access). The tree owner has complete control and cannot be removed.'
      },
      {
        question: 'How do I ask a relative who does not use NasabLink?',
        answer: 'Open Manage \u2192 Contributions and create a link for one person. Send it to a relative by message or email. They open it on their phone, answer a few questions about that person, and send them back \u2014 no account, no sign-up, nothing to install. The questions are drawn from whatever that person\u2019s record is still missing, plus any custom fields you added to your person form.'
      },
      {
        question: 'Does a contribution link let someone edit my tree?',
        answer: 'No. Nothing a contributor writes touches the tree. Every answer arrives as a proposal in Manage \u2192 Contributions, showing who said it, what they said, and what it would replace. You accept or discard each one. A link is also scoped to the single person it was created for, so it cannot be used to browse the rest of your family.'
      },
      {
        question: 'Can I stop a contribution link working?',
        answer: 'Yes. Close it from Manage \u2192 Contributions at any time and it stops opening immediately, or set it to close automatically after 7, 30 or 90 days when you create it. Answers already sent stay in your review queue.'
      },
      {
        question: 'How do viewer links work?',
        answer: 'Viewer links are shareable URLs that give anyone temporary read-only access to your tree. You can set expiration dates and usage limits. Perfect for sharing with distant relatives who don\'t need a full account.'
      },
      {
        question: 'Can I connect my tree with another family\'s tree?',
        answer: 'Yes! Use the Connections feature to request a link between your tree and another family tree on NasabLink. Once approved, you can share relationships and data between the trees.'
      }
    ]
  },
  {
    id: 'privacy-security',
    name: 'Privacy & Security',
    icon: Shield,
    faqs: [
      {
        question: 'Who can see my family tree?',
        answer: 'By default, only you and people you explicitly invite can see your tree. Viewer links provide temporary access to anyone with the link, but you control when these expire and how many times they can be used.'
      },
      {
        question: 'Is my family data secure?',
        answer: 'Yes! We use industry-standard encryption for data in transit and at rest. We authenticate through Google OAuth for secure sign-in, and we never share your data with third parties for advertising purposes.'
      },
      {
        question: 'Can I delete my account and data?',
        answer: 'Yes, you can delete your account at any time from your account settings. This will permanently remove all your personal data and any trees you own. Shared trees will be transferred or deleted based on your preferences.'
      },
      {
        question: 'How do you handle sensitive family information?',
        answer: 'We treat all family data as sensitive. Access is strictly controlled through our role-based system. Death dates and other sensitive fields can be hidden by default in forms. You control who sees what in your family tree.'
      }
    ]
  },
  {
    id: 'billing',
    name: 'Plans & Billing',
    icon: CreditCard,
    faqs: [
      {
        question: 'What\'s included in the Free plan?',
        answer: 'The Free plan includes 2 active trees, up to 100 relatives per tree, basic roles (2 Admins, 3 Verifiers, 20 Viewers), and shareable viewer links. It\'s perfect for getting started with your family history.'
      },
      {
        question: 'What additional features does Plus offer?',
        answer: 'Plus includes 10 active trees, up to 1,000 relatives per tree, document storage (100 encrypted files) with citation support (link documents as evidence to person facts), advanced tree features, extended roles (20 Admins, 20 Verifiers, 100 Viewers), and priority support.'
      },
      {
        question: 'How do I upgrade to Plus?',
        answer: 'You can upgrade to Plus from your account settings or when you hit a Free plan limit. We accept major credit cards and the subscription renews monthly or annually based on your preference.'
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes, you can cancel anytime. You\'ll keep Plus features until the end of your billing period, then your account will revert to Free. Your data is never deleted, but some features may become limited.'
      }
    ]
  },
  {
    id: 'features',
    name: 'Features & Tips',
    icon: Settings,
    faqs: [
      {
        question: 'How do I search for someone in my tree?',
        answer: 'Use the search bar in the tree viewer to find any family member by name. You can also use the smart search feature that looks at Arabic names and alternate spellings.'
      },
      {
        question: 'How do I undo a mistake?',
        answer: 'When you delete a person, you\'ll see an "Undo" option for a few seconds. For other changes, you can use the activity log to track what was changed and by whom, then manually revert if needed.'
      },
      {
        question: 'Does NasabLink work on mobile?',
        answer: 'Yes! NasabLink is fully responsive and works great on phones and tablets. You can view and edit your family tree from any device with a web browser.'
      },
      {
        question: 'What are citations and how do I use them?',
        answer: 'Citations let you attach source documents (birth certificates, census records, photos) as evidence for any fact on a person. When editing a person, you\'ll see a small document icon next to each field — click it to attach a source. You can specify the event type (Birth, Death, Marriage, etc.), a reference detail (e.g. "Page 3, entry 12"), and a confidence level (Primary, Secondary, or Unverified). All citations appear in the "Evidence & Documents" section of a person\'s profile.'
      },
      {
        question: 'What is the difference between Primary, Secondary, and Unverified sources?',
        answer: 'Primary sources are original documents created at the time of the event (e.g. a birth certificate). Secondary sources are derivative records created after the fact (e.g. a family bible entry, a transcription). Unverified means the source hasn\'t been confirmed against an original record yet. These confidence levels help you and your collaborators assess how reliable each piece of information is.'
      }
    ]
  },
  {
    id: 'sharing',
    name: 'Sharing & Export',
    icon: Share2,
    faqs: [
      {
        question: 'How can I share my tree on social media?',
        answer: 'Use the Share button in the tree viewer to generate a shareable viewer link, then post it on Facebook, Twitter, WhatsApp, or any platform. You can also copy a direct link to share via email or messaging.'
      },
      {
        question: 'Can I print my family tree?',
        answer: 'Yes! Use the print function in the tree viewer to generate a printable version of your family tree. The tree is formatted for standard paper sizes and includes all visible family members.'
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes. On Free and Plus, open Manage → Data Export to download your tree as JSON or GEDCOM for backup or use in other genealogy tools.'
      },
      {
        question: 'Can I change how children are arranged in the tree?',
        answer: 'Yes. On Free and Plus, open Manage → Tree Layout and choose Vertical, Horizontal, Alternating, or Dynamic. Reload the tree page after saving.'
      }
    ]
  }
];

const FAQItem = ({ faq, isOpen, onToggle }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full py-4 flex items-center justify-between text-start hover:bg-gray-50 dark:hover:bg-gray-800/50 px-4 -mx-4 transition-all duration-300 ease-out"
    >
      <span className="font-medium text-gray-900 dark:text-white pe-4">{faq.question}</span>
      <motion.span
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.25, ease: easeOut }}
        className="flex-shrink-0"
      >
        <ChevronDown className="w-5 h-5 text-gray-500" />
      </motion.span>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          key="answer"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: easeOut }}
          className="overflow-hidden"
        >
          <div className="pb-4 px-4 -mx-4 text-gray-600 dark:text-gray-400 leading-relaxed">
            {faq.answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const HelpPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqs, setOpenFaqs] = useState({});
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const reduceMotion = useReducedMotion();

  const toggleFaq = (categoryId, faqIndex) => {
    const key = `${categoryId}-${faqIndex}`;
    setOpenFaqs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter FAQs based on search
  const filteredCategories = searchQuery
    ? faqCategories.map(cat => ({
        ...cat,
        faqs: cat.faqs.filter(faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.faqs.length > 0)
    : faqCategories;

  const currentCategory = filteredCategories.find(c => c.id === activeCategory) || filteredCategories[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          variants={fadeUp}
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
        >
          <Link to="/" className="inline-block mb-6">
            <Logo size={48} className="rounded-xl shadow-lg" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Help Center
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find answers to common questions and learn how to make the most of NasabLink
          </p>
        </motion.div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute start-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-12 pe-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Card className="p-6 hover:shadow-lg transition-all duration-400 ease-out cursor-pointer" onClick={() => window.location.href = 'mailto:nasablink@misbahi.zohodesk.com'}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Email Support</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Get help via email</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-400 ease-out cursor-pointer" onClick={() => setActiveCategory('getting-started')}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Book className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Getting Started</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">New to NasabLink?</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all duration-400 ease-out cursor-pointer" onClick={() => setActiveCategory('billing')}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Plans & Billing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pricing questions</p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Category Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 px-2">Categories</h3>
              <nav className="space-y-1">
                {faqCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive = category.id === activeCategory;
                  const hasResults = filteredCategories.some(c => c.id === category.id);
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      disabled={!hasResults && searchQuery}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : hasResults || !searchQuery
                          ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          : 'opacity-50 cursor-not-allowed text-gray-400'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* FAQ Content */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              {currentCategory ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    {React.createElement(currentCategory.icon, { className: 'w-6 h-6 text-primary-600 dark:text-primary-400' })}
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {currentCategory.name}
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {currentCategory.faqs.map((faq, index) => (
                      <FAQItem
                        key={index}
                        faq={faq}
                        isOpen={openFaqs[`${currentCategory.id}-${index}`]}
                        onToggle={() => toggleFaq(currentCategory.id, index)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try a different search term or browse the categories
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Contact Section */}
        <Card className="mt-12 p-8 text-center bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 border-primary-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Still need help?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-xl mx-auto">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <a href="mailto:nasablink@misbahi.zohodesk.com">
            <Button size="lg">
              <Mail className="w-5 h-5 me-2" />
              Contact Support
            </Button>
          </a>
        </Card>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link to="/">
            <Button variant="outline">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
