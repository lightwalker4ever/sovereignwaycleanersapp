import { PageContainer } from "@/components/shell/PageContainer";
import { DataTable, DataTableHeadRow } from "@/components/ui/DataTable";
import { ContractorApplicationsList } from "@/components/admin/ContractorApplicationsList";
import { JobApplicationStatusSelect } from "@/components/admin/JobApplicationStatusSelect";
import { listContractorApplications, listJobApplications } from "./actions";

export default async function RecruitmentPage() {
  const [contractorApplications, jobApplications] = await Promise.all([
    listContractorApplications(),
    listJobApplications(),
  ]);

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        <p className="mt-1 text-sm text-gray-600">
          Contractor-pool applications and job-posting applicants, in one place.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Contractor applications</h2>
        <ContractorApplicationsList rows={contractorApplications} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-900">Job applications</h2>
        <DataTable minWidth={720}>
          <DataTableHeadRow>
            <th className="px-4 py-3 font-semibold">Role</th>
            <th className="px-2 py-3 font-semibold">Name</th>
            <th className="px-2 py-3 font-semibold">Contact</th>
            <th className="px-2 py-3 font-semibold">CV</th>
            <th className="px-2 py-3 font-semibold">Status</th>
          </DataTableHeadRow>
          <tbody>
            {jobApplications.map((app) => (
              <tr key={app.id} className="border-t border-dash-border-soft align-top">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{app.jobTitle}</td>
                <td className="px-2 py-3">
                  {app.fullName}
                  {app.message && <p className="mt-1 max-w-xs text-xs text-gray-500">{app.message}</p>}
                </td>
                <td className="px-2 py-3 text-xs text-gray-600">
                  <div>{app.email}</div>
                  <div>{app.phone}</div>
                </td>
                <td className="px-2 py-3">
                  {app.cvUrl ? (
                    <a href={app.cvUrl} target="_blank" rel="noreferrer" className="text-dash-brand-700 underline">
                      View CV
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-2 py-3">
                  <JobApplicationStatusSelect applicationId={app.id} initialStatus={app.status} />
                </td>
              </tr>
            ))}
            {jobApplications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  No job applications yet.
                </td>
              </tr>
            )}
          </tbody>
        </DataTable>
      </div>
    </PageContainer>
  );
}
