import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { CreateLocationMultiplierForm } from "@/components/admin/CreateLocationMultiplierForm";
import { LocationMultiplierRowActions } from "@/components/admin/LocationMultiplierRowActions";
import { MATCH_TYPE_LABEL } from "@/lib/location-multiplier-labels";
import { listLocationMultipliers, updateLocationMultiplierField } from "./actions";

export default async function LocationPricingPage() {
  const items = await listLocationMultipliers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Location Pricing</h1>
        <p className="mt-1 text-sm text-gray-600">
          Price multipliers applied by the area a quote&apos;s postcode resolves to. The lowest
          priority number is checked first; the fallback rate always applies last.
        </p>
      </div>

      <Card className="p-5">
        <CardHeader>
          <CardTitle>Areas</CardTitle>
          <CardDescription>
            Unlike the rate card, areas can be added and removed here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreateLocationMultiplierForm />

          <div className="divide-y divide-gray-100 rounded-lg ring-1 ring-foreground/10">
            {items.map((item) => {
              const isDefault = item.matchType === "default";
              return (
                <div key={item.id} className="grid grid-cols-6 items-center gap-3 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {MATCH_TYPE_LABEL[item.matchType] ?? item.matchType}
                  </div>
                  <div>
                    {isDefault ? (
                      <span className="text-sm text-gray-400">—</span>
                    ) : (
                      <EditableTextCell
                        value={item.matchValue}
                        onSave={updateLocationMultiplierField.bind(null, item.id, "matchValue")}
                      />
                    )}
                  </div>
                  <div>
                    <EditableTextCell
                      value={item.label}
                      onSave={updateLocationMultiplierField.bind(null, item.id, "label")}
                    />
                  </div>
                  <div>
                    <EditableTextCell
                      value={String(item.multiplier)}
                      type="number"
                      onSave={updateLocationMultiplierField.bind(null, item.id, "multiplier")}
                    />
                  </div>
                  <div>
                    <EditableTextCell
                      value={String(item.priority)}
                      type="number"
                      onSave={updateLocationMultiplierField.bind(null, item.id, "priority")}
                    />
                  </div>
                  <div className="flex justify-end">
                    <LocationMultiplierRowActions id={item.id} isDefault={isDefault} />
                  </div>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-400">No areas configured.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
