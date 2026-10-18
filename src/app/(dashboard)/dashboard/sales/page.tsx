import { ContactRequestList } from "@/components/sales/ContactRequestList";
import { listContactRequests } from "./actions";

export default async function SalesPage() {
  const requests = await listContactRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enquiries</h1>
        <p className="mt-1 text-sm text-gray-600">
          Contact-form submissions from the website, newest first.
        </p>
      </div>

      <ContactRequestList requests={requests} />
    </div>
  );
}
