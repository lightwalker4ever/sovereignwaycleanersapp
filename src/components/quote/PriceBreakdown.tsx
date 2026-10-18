import type { QuoteBreakdown } from "@/lib/quote-calculations";

function formatGBP(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export function PriceBreakdown({ breakdown }: { breakdown: QuoteBreakdown }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="space-y-1">
        {breakdown.lineItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-gray-600">
            <span>{item.label}</span>
            <span>{formatGBP(item.amount)}</span>
          </div>
        ))}
      </div>

      {breakdown.locationMultiplier !== 1 && (
        <div className="flex items-center justify-between text-gray-600">
          <span>Location adjustment ({breakdown.locationLabel})</span>
          <span>
            {breakdown.locationMultiplier > 1 ? "+" : ""}
            {Math.round((breakdown.locationMultiplier - 1) * 100)}%
          </span>
        </div>
      )}

      <div className="border-t border-gray-100 pt-2">
        <div className="flex items-center justify-between text-gray-700">
          <span>Subtotal (ex. VAT)</span>
          <span>{formatGBP(breakdown.subtotalExVat)}</span>
        </div>
        <div className="flex items-center justify-between text-gray-700">
          <span>VAT</span>
          <span>{formatGBP(breakdown.vatAmount)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-base font-bold text-gray-900">
          <span>Total (inc. VAT)</span>
          <span>{formatGBP(breakdown.totalIncVat)}</span>
        </div>
      </div>

      {breakdown.estMonthlyCost !== undefined && (
        <div>
          <div className="flex items-center justify-between font-medium text-gray-900">
            <span>Est. Monthly Cost</span>
            <span>{formatGBP(breakdown.estMonthlyCost)}</span>
          </div>
          <p className="text-xs text-gray-400">
            Indicative only, based on your selected frequency — final invoicing may vary.
          </p>
        </div>
      )}
    </div>
  );
}
