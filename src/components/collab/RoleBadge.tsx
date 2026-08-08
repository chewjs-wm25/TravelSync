import type { CollabRole } from "@/src/lib/client/collab/RolePermissions";

const ROLE_STYLES: Record<CollabRole, string> = {
  Owner: "bg-red-50 text-primary-500",
  Editor: "bg-secondary-500/10 text-secondary-500",
  Viewer: "bg-gray-100 text-gray-500",
};

export default function RoleBadge({
  role,
  compact,
}: {
  role: CollabRole;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-semibold ${ROLE_STYLES[role]} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      {role}
    </span>
  );
}
