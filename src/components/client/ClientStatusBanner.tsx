export const CLIENT_STATUS_LABELS: Record<string, string> = {
  assigned: "Cleaner Assigned — Waiting For The Job To Start",
  in_progress: "Cleaning In Progress",
  in_review: "Cleaning In Review",
  completed: "Cleaning Completed",
};

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  assigned: {
    label: CLIENT_STATUS_LABELS.assigned,
    className: "bg-gray-100 text-gray-800 ring-gray-200",
  },
  in_progress: {
    label: CLIENT_STATUS_LABELS.in_progress,
    className: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  in_review: {
    label: CLIENT_STATUS_LABELS.in_review,
    className: "bg-blue-100 text-blue-800 ring-blue-200",
  },
  completed: {
    label: CLIENT_STATUS_LABELS.completed,
    className: "bg-green-100 text-green-800 ring-green-200",
  },
};

export function ClientStatusBanner({
  status,
  cleanerName,
  completedAt,
}: {
  status: string;
  cleanerName: string | null;
  completedAt: string | null;
}) {
  const info = STATUS_INFO[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 ring-gray-200",
  };

  return (
    <div className={`rounded-xl p-5 ring-1 ${info.className}`}>
      <p className="text-lg font-semibold">{info.label}</p>
      {cleanerName && <p className="mt-1 text-sm">Cleaner: {cleanerName}</p>}
      {status === "completed" && completedAt && (
        <p className="mt-1 text-sm">
          Completed on {new Date(completedAt).toLocaleDateString("en-GB")}
        </p>
      )}
    </div>
  );
}
