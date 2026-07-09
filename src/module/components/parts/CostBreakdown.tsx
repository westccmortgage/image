import type { CashToCloseResult, LineItem } from '../../types';
import { formatMoneyExact, formatPercent } from '../../calc/format';

function Row({ item }: { item: LineItem }) {
  return (
    <div className="ctc-row ctc-row-sub">
      <span className="lbl">
        {item.label}
        {item.note ? <small>{item.note}</small> : null}
      </span>
      <span className="amt">{formatMoneyExact(item.amount)}</span>
    </div>
  );
}

function GroupHead({ title, total }: { title: string; total: number }) {
  return (
    <div className="ctc-group-head">
      <span>{title}</span>
      <span>{formatMoneyExact(total)}</span>
    </div>
  );
}

/** Full itemized breakdown of every cost that makes up cash to close. */
export function CostBreakdown({ result }: { result: CashToCloseResult }) {
  return (
    <div className="ctc-card ctc-card-pad-lg">
      <h3 className="ctc-section-title">Estimated cash to close — full breakdown</h3>
      <p className="ctc-section-sub">
        Every figure below is computed deterministically from your inputs.
      </p>

      <div className="ctc-rows">
        {/* Loan snapshot */}
        <div className="ctc-row">
          <span className="lbl">Purchase price</span>
          <span className="amt">{formatMoneyExact(result.purchasePrice)}</span>
        </div>
        <div className="ctc-row">
          <span className="lbl">
            Down payment
            <small>{formatPercent(result.downPaymentPercent)} of purchase price</small>
          </span>
          <span className="amt">{formatMoneyExact(result.downPayment)}</span>
        </div>
        <div className="ctc-row">
          <span className="lbl">
            Loan amount
            <small>LTV {formatPercent(result.ltv)}</small>
          </span>
          <span className="amt">{formatMoneyExact(result.loanAmount)}</span>
        </div>

        {/* Monthly payment */}
        <GroupHead
          title="Estimated monthly housing payment"
          total={result.monthlyHousingPayment}
        />
        <Row item={{ label: 'Principal & interest', amount: result.monthlyPI }} />
        <Row item={{ label: 'Property taxes', amount: result.monthlyTaxes }} />
        <Row item={{ label: "Homeowner's insurance", amount: result.monthlyInsurance }} />

        {/* Lender fees */}
        <GroupHead title="Lender fees" total={result.lenderFeesTotal} />
        {result.lenderFees.map((it, i) => (
          <Row key={`l${i}`} item={it} />
        ))}

        {/* Third-party fees */}
        <GroupHead title="Third-party fees" total={result.thirdPartyFeesTotal} />
        {result.thirdPartyFees.map((it, i) => (
          <Row key={`t${i}`} item={it} />
        ))}

        {/* Government fees */}
        <GroupHead title="Government fees" total={result.governmentFeesTotal} />
        {result.governmentFees.map((it, i) => (
          <Row key={`g${i}`} item={it} />
        ))}

        {/* Prepaids & escrow */}
        <GroupHead
          title="Prepaids & initial escrow"
          total={result.prepaidsAndEscrowTotal}
        />
        {result.prepaidsBreakdown.map((it, i) => (
          <Row key={`p${i}`} item={it} />
        ))}

        {/* Credits */}
        {(result.sellerCredit > 0 || result.lenderCredit > 0) && (
          <>
            <GroupHead
              title="Credits"
              total={-(result.sellerCredit + result.lenderCredit)}
            />
            {result.sellerCredit > 0 && (
              <div className="ctc-row ctc-row-sub ctc-row-credit">
                <span className="lbl">Seller credit</span>
                <span className="amt">−{formatMoneyExact(result.sellerCredit)}</span>
              </div>
            )}
            {result.lenderCredit > 0 && (
              <div className="ctc-row ctc-row-sub ctc-row-credit">
                <span className="lbl">Lender credit</span>
                <span className="amt">−{formatMoneyExact(result.lenderCredit)}</span>
              </div>
            )}
          </>
        )}

        {/* Totals */}
        <div className="ctc-row ctc-row-total">
          <span className="lbl">Estimated total cash needed to close</span>
          <span className="amt">{formatMoneyExact(result.totalCashToClose)}</span>
        </div>
        <div className="ctc-row">
          <span className="lbl">Additional funds needed above down payment</span>
          <span className="amt">{formatMoneyExact(result.additionalFundsNeeded)}</span>
        </div>
      </div>
    </div>
  );
}
