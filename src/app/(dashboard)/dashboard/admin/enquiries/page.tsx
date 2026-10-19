import { ContactRequestList } from "@/components/sales/ContactRequestList";
import { listContactRequests } from "../../sales/actions";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function AdminEnquiriesPage() {
  const requests = await listContactRequests();

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <p className="mt-1 text-sm text-gray-600">
          Contact-form submissions from the website, newest first.
        </p>
      </div>

      <ContactRequestList requests={requests} />
    </PageContainer>
  );
}
