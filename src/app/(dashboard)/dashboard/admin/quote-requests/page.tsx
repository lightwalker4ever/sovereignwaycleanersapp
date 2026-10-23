import { listQuoteRequests } from "./actions";
import { QuoteRequestsList } from "@/components/admin/QuoteRequestsList";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function QuoteRequestsPage() {
  const rows = await listQuoteRequests();

  return (
    <PageContainer>
      <header>
        <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Quote Requests</h1>
        <p className="mt-1 text-sm text-dash-muted">
          Tailored requests from the website -- no instant price yet. Click a row to see the details and send a price.
        </p>
      </header>

      <QuoteRequestsList rows={rows} />
    </PageContainer>
  );
}
