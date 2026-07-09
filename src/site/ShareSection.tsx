import { useState } from 'react';
import { SITE_URL } from './walletWccm';

/**
 * Compact share block — Copy Link + Share With Buyer. Clipboard / Web Share are
 * progressive: they no-op gracefully where absent. Copy is reusable for the
 * realtor block and the general "use anywhere" block via title/subtitle props.
 */
export function ShareSection({
  title = 'Send this before your buyer writes an offer.',
  subtitle,
  id = 'share',
}: {
  title?: string;
  subtitle?: string;
  id?: string;
}) {
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
        /* cancelled — fall through to copy */
      }
    }
    void copyLink();
  };

  return (
    <section className="ww-share" id={id}>
      <p className="ww-share-title">{title}</p>
      {subtitle ? <p className="ww-share-sub">{subtitle}</p> : null}
      <div className="ww-btn-row">
        <button className="ww-btn ww-btn-primary" type="button" onClick={copyLink}>
          {copied ? 'Link copied' : 'Copy Link'}
        </button>
        <button
          className="ww-btn ww-btn-outline"
          type="button"
          onClick={shareWithBuyer}
        >
          Share With Buyer
        </button>
      </div>
    </section>
  );
}
