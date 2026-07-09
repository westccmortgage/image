import { useState } from 'react';
import { SITE_URL } from './walletWccm';

/**
 * "Use this tool anywhere" — copy link + share-with-buyer, plus an embed note.
 * Clipboard / Web Share are progressive: they no-op gracefully where absent.
 */
export function ShareSection() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard?.writeText(SITE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareWithBuyer = async () => {
    const shareData = {
      title: 'Wallet WCCM · AI Cash-to-Close Advisor',
      text: 'Estimate the real cash needed to close — not just the down payment.',
      url: SITE_URL,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    void copyLink();
  };

  return (
    <section className="ww-card ww-share" id="share">
      <h2 className="ww-h2">Use this tool anywhere</h2>
      <p className="ww-muted">
        Share the Wallet WCCM AI Cash-to-Close Advisor with buyers and partners.
      </p>

      <div className="ww-linkrow">
        <span className="ww-link-label">Direct link</span>
        <code className="ww-link">{SITE_URL}</code>
      </div>

      <div className="ww-btn-row">
        <button className="ww-btn ww-btn-primary" type="button" onClick={copyLink}>
          {copied ? 'Link Copied ✓' : 'Copy Tool Link'}
        </button>
        <button
          className="ww-btn ww-btn-gold"
          type="button"
          onClick={shareWithBuyer}
        >
          Share With Buyer
        </button>
      </div>

      <p className="ww-note">
        Embedding code can be added later for partner websites.
      </p>
    </section>
  );
}
