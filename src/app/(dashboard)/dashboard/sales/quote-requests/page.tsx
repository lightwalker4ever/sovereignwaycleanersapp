import { listQuoteRequests } from "../../admin/quote-requests/actions";
import { QuoteRequestsList } from "@/components/admin/QuoteRequestsList";

export default async function SalesQuoteRequestsPage() {
  const rows = await listQuoteRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quote Requests</h1>
        <p className="mt-1 text-sm text-gray-600">
          Tailored requests for services with no instant price -- click a row to see the details and send a price.
        </p>
      </div>

      <QuoteRequestsList rows={rows} />
    </div>
  );
}
