export type CollabRole = "Owner" | "Editor" | "Viewer";

export type Permission =
  | "view"
  | "invite"
  | "cancelInvite"
  | "changeRole"
  | "removeMember"
  | "leave"
  | "editItinerary"
  | "comment"
  | "manageTrip";

export const ROLE_LABELS: Record<CollabRole, string> = {
  Owner: "Owner",
  Editor: "Editor",
  Viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<CollabRole, string> = {
  Owner:
    "Full control: invite collaborators, assign roles, remove members, edit everything.",
  Editor:
    "Can create / modify / delete itinerary items, post comments and edit trip details.",
  Viewer: "Read-only access to the trip and its itinerary.",
};

const ROLE_PERMISSIONS: Record<CollabRole, Permission[]> = {
  Owner: [
    "view",
    "invite",
    "cancelInvite",
    "changeRole",
    "removeMember",
    "editItinerary",
    "comment",
    "manageTrip",
  ],
  Editor: ["view", "editItinerary", "comment", "manageTrip", "leave"],
  Viewer: ["view", "leave"],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  view: "View trip & itinerary",
  invite: "Invite collaborators",
  cancelInvite: "Cancel invitations",
  changeRole: "Assign / change roles",
  removeMember: "Remove members",
  leave: "Leave the trip",
  editItinerary: "Edit itinerary details",
  comment: "Post group comments",
  manageTrip: "Manage trip details",
};

export function can(role: CollabRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const PERMISSION_MATRIX: { permission: Permission; roles: Record<CollabRole, boolean> }[] = (
  [
    "view",
    "invite",
    "cancelInvite",
    "changeRole",
    "removeMember",
    "editItinerary",
    "comment",
    "manageTrip",
  ] as Permission[]
).map((permission) => ({
  permission,
  roles: {
    Owner: can("Owner", permission),
    Editor: can("Editor", permission),
    Viewer: can("Viewer", permission),
  },
}));
