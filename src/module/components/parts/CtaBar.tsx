import type { CtaAction } from './ctaActions';

export function CtaBar({ actions }: { actions: CtaAction[] }) {
  return (
    <div className="ctc-cta-bar">
      {actions.map((a) => (
        <a
          key={a.id}
          className={`ctc-btn ctc-btn-${a.variant}`}
          href={a.href ?? '#'}
          onClick={a.onClick}
        >
          {a.label}
        </a>
      ))}
    </div>
  );
}
