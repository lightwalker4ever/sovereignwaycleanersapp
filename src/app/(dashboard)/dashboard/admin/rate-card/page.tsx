import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { listRateCardItems, updateRateCardValue, type RateCardItemRow } from "./actions";
import { PageContainer } from "@/components/shell/PageContainer";

const SERVICE_ORDER = ["general", "end_of_tenancy", "deep_cleaning", "office_cleaning"] as const;

const SERVICE_LABEL: Record<string, string> = {
  general: "General",
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

function groupByLabel(items: RateCardItemRow[]) {
  const groups: { groupLabel: string; items: RateCardItemRow[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.groupLabel === item.groupLabel);
    if (!group) {
      group = { groupLabel: item.groupLabel, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export default async function RateCardPage() {
  const items = await listRateCardItems();

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rate Card</h1>
        <p className="mt-1 text-sm text-gray-600">
          Edit the values below — rows are fixed by the pricing formulas, only the numbers
          themselves can be changed here.
        </p>
      </div>

      {SERVICE_ORDER.map((service) => {
        const serviceItems = items.filter((i) => i.service === service);
        if (serviceItems.length === 0) return null;

        return (
          <Card key={service} className="p-5">
            <CardHeader>
              <CardTitle>{SERVICE_LABEL[service] ?? service}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupByLabel(serviceItems).map((group) => (
                <div key={group.groupLabel} className="space-y-2">
                  <CardDescription className="text-xs font-medium uppercase tracking-wide">
                    {group.groupLabel}
                  </CardDescription>
                  <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-xs text-gray-500">{item.sublabel}</p>
                          )}
                        </div>
                        <EditableTextCell
                          value={String(item.value)}
                          type="number"
                          onSave={updateRateCardValue.bind(null, item.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </PageContainer>
  );
}
