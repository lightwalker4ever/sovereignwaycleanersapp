"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableHeadRow } from "@/components/ui/DataTable";
import { ContractorApplicationDrawer } from "@/components/admin/ContractorApplicationDrawer";
import type { ContractorApplicationRow } from "@/app/(dashboard)/dashboard/admin/recruitment/actions";
import { capitalize } from "@/lib/utils";

export function ContractorApplicationsList({ rows }: { rows: ContractorApplicationRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <DataTable minWidth={520}>
        <DataTableHeadRow>
          <th className="px-4 py-3 font-semibold">Reference</th>
          <th className="px-2 py-3 font-semibold">Name</th>
          <th className="px-2 py-3 font-semibold">Status</th>
          <th className="px-2 py-3 font-semibold">Submitted</th>
          <th className="px-4 py-3 font-semibold"></th>
        </DataTableHeadRow>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => setOpenId(row.id)}
              className="cursor-pointer border-t border-dash-border-soft hover:bg-dash-bg"
            >
              <td className="px-4 py-3 font-medium whitespace-nowrap">{row.reference}</td>
              <td className="px-2 py-3">{row.fullName}</td>
              <td className="px-2 py-3">
                <Badge variant={row.status === "approved" || row.status === "rejected" ? "default" : "outline"}>
                  {capitalize(row.status.replace("_", " "))}
                </Badge>
              </td>
              <td className="px-2 py-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleDateString("en-GB")}</td>
              <td className="px-4 py-3 text-right">
                <ChevronRight size={16} className="text-gray-400" aria-hidden="true" />
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                No contractor applications yet.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>

      {openId && (
        <ContractorApplicationDrawer applicationId={openId} open={Boolean(openId)} onOpenChange={(open) => !open && setOpenId(null)} />
      )}
    </>
  );
}
