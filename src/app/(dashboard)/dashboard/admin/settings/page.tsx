import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ContactFormToggle } from "@/components/admin/ContactFormToggle";
import { getContactFormEnabled } from "./actions";

export default async function AdminSettingsPage() {
  const contactFormEnabled = await getContactFormEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Site-wide toggles.</p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Contact form</CardTitle>
          <CardDescription>
            Turn the homepage contact form off once the instant quote and booking flow covers
            what you need — visitors will see an alternative way to reach you instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactFormToggle initialEnabled={contactFormEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
