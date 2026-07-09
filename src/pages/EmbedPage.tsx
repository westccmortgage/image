import { CashToCloseWidget } from '../module';
import { EMBED, SITE_URL, walletWccmConfig } from '../site/walletWccm';

/**
 * `/embed` — compact, iframe-friendly widget version of the tool.
 * Minimal chrome so partner sites can drop it into an <iframe>. The CTA routes
 * out to the full standalone tool.
 */
export function EmbedPage() {
  return (
    <div className="ww-embed ww-theme">
      <CashToCloseWidget
        config={{
          ...walletWccmConfig,
          primaryCTA: { label: 'Estimate My Cash to Close', href: SITE_URL },
        }}
        advisorHref="/"
        headline={EMBED.headline}
        subtext={EMBED.subtext}
        hideSecondaryCta
      />
      <p className="ww-embed-note">
        Wallet WCCM · Powered by West Coast Capital Mortgage · Educational
        estimate only.
      </p>
    </div>
  );
}

export default EmbedPage;
