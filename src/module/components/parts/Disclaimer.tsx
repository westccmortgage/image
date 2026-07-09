import type { BrandConfig } from '../../brand';

/** Compliance disclaimer + optional NMLS/license line. */
export function Disclaimer({ config }: { config: BrandConfig }) {
  return (
    <div className="ctc-disclaimer">
      <strong>Important disclosure. </strong>
      {config.disclosureText}
      {config.nmlsLine ? <div className="ctc-nmls">{config.nmlsLine}</div> : null}
    </div>
  );
}
