import { Link } from 'react-router-dom';

/**
 * California Mortgage logo lockup — serif wordmark with a gold house icon,
 * matching californiamtg.com.
 */
export function BrandMark() {
  return (
    <Link to="/" className="cm-brand" aria-label="California Mortgage home">
      <span className="cm-brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 11.5 12 4l9 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 10.2V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 20v-4.5a2 2 0 0 1 4 0V20"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="cm-brand-text">
        California<br />Mortgage
      </span>
    </Link>
  );
}
