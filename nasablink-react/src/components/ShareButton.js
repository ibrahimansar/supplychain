import React, { useState } from 'react';
import { Share2, Copy, Check, Facebook, Twitter, Mail, MessageCircle, Link2 } from 'lucide-react';
import Button from './ui/Button';
import Dialog, { DialogHeader, DialogBody } from './ui/Dialog';

/**
 * ShareButton - Social sharing component
 * 
 * @param {string} url - The URL to share
 * @param {string} title - The title/text to share
 * @param {string} description - Optional description
 * @param {string} variant - Button variant ('icon' | 'button' | 'full')
 */
const ShareButton = ({ 
  url, 
  title = 'Check out my family tree on NasabLink!', 
  description = 'I\'m building my family tree on NasabLink. Join me!',
  variant = 'button',
  className = '' 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.href;

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#166FE5]',
      onClick: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`,
          'facebook-share',
          'width=580,height=400'
        );
      }
    },
    {
      name: 'Twitter / X',
      icon: Twitter,
      color: 'bg-black hover:bg-gray-800',
      onClick: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
          'twitter-share',
          'width=580,height=400'
        );
      }
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366] hover:bg-[#22C55E]',
      onClick: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`,
          'whatsapp-share'
        );
      }
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700',
      onClick: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${shareUrl}`)}`;
      }
    },
  ];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
          setShowModal(true);
        }
      }
    } else {
      setShowModal(true);
    }
  };

  // Render based on variant
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors ${className}`}
          title="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <ShareModal 
          open={showModal} 
          onClose={() => setShowModal(false)} 
          shareOptions={shareOptions}
          shareUrl={shareUrl}
          copied={copied}
          onCopy={handleCopyLink}
        />
      </>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex flex-wrap gap-2">
          {shareOptions.map((option) => (
            <button
              key={option.name}
              onClick={option.onClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${option.color}`}
            >
              <option.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{option.name}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 me-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 me-2" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <>
      <Button
        variant="outline"
        onClick={handleNativeShare}
        className={className}
      >
        <Share2 className="w-4 h-4 me-2" />
        Share
      </Button>
      <ShareModal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        shareOptions={shareOptions}
        shareUrl={shareUrl}
        copied={copied}
        onCopy={handleCopyLink}
      />
    </>
  );
};

// Share Modal Component
const ShareModal = ({ open, onClose, shareOptions, shareUrl, copied, onCopy }) => (
  <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
    <DialogHeader title="share-dialog" onClose={onClose}>
      Share
    </DialogHeader>
    <DialogBody>
      <div className="space-y-6">
        {/* Social Share Buttons */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Share on social media</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => {
                  option.onClick();
                  onClose();
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all hover:scale-105 ${option.color}`}
              >
                <option.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{option.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Copy Link */}
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Or copy link</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
              <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-gray-900 dark:text-white text-sm outline-none"
              />
            </div>
            <Button
              variant={copied ? 'solid' : 'outline'}
              onClick={onCopy}
              className={`flex-shrink-0 ${copied ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 me-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 me-2" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DialogBody>
  </Dialog>
);

/**
 * ShareTreeButton - Specialized share button for family trees
 */
export const ShareTreeButton = ({ treeName, treeId, viewerLinkUrl, className = '' }) => {
  const title = `Check out the ${treeName} family tree on NasabLink!`;
  const description = `I'm building the ${treeName} family tree on NasabLink. You can view it and explore our family history.`;
  const url = viewerLinkUrl || `${window.location.origin}/trees/${treeId}`;

  return (
    <ShareButton
      url={url}
      title={title}
      description={description}
      className={className}
    />
  );
};

/**
 * QuickShareButtons - Inline social share buttons
 */
export const QuickShareButtons = ({ url, title, className = '' }) => {
  const shareUrl = url || window.location.href;
  const shareTitle = title || 'Check this out!';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={() => window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          'facebook-share',
          'width=580,height=400'
        )}
        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-[#1877F2] transition-colors"
        title="Share on Facebook"
      >
        <Facebook className="w-5 h-5" />
      </button>
      <button
        onClick={() => window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
          'twitter-share',
          'width=580,height=400'
        )}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-black dark:text-white transition-colors"
        title="Share on Twitter"
      >
        <Twitter className="w-5 h-5" />
      </button>
      <button
        onClick={() => window.open(
          `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`,
          'whatsapp-share'
        )}
        className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-[#25D366] transition-colors"
        title="Share on WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ShareButton;
