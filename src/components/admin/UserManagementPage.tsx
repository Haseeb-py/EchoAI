"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserCog,
  UserMinus,
  Users,
} from "lucide-react";
import { AdminHeader, AdminSidebar } from "@/components/admin/AdminNavigation";
import { AdminFormField, AdminMessage, AdminStatCard } from "@/components/admin/AdminScreenShell";
import { Button } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/ui-components";

type TeamUser = {
  id: number;
  name: string;
  email: string;
  role: "Agent" | "Supervisor";
  status: "Active" | "Inactive" | "Locked";
  lastLogin: string;
  assignedCampaign: string;
};

const initialUsers: TeamUser[] = [
  {
    id: 1,
    name: "Ayesha Khan",
    email: "ayesha.agent@echoai.local",
    role: "Agent",
    status: "Active",
    lastLogin: "Today, 10:20 AM",
    assignedCampaign: "Q2 BPO Modernization Sprint",
  },
  {
    id: 2,
    name: "Hamza Malik",
    email: "hamza.supervisor@echoai.local",
    role: "Supervisor",
    status: "Active",
    lastLogin: "Today, 09:45 AM",
    assignedCampaign: "All Campaigns",
  },
  {
    id: 3,
    name: "Mariam Shah",
    email: "mariam.agent@echoai.local",
    role: "Agent",
    status: "Locked",
    lastLogin: "Yesterday, 06:15 PM",
    assignedCampaign: "Telecom Renewal Pilot",
  },
  {
    id: 4,
    name: "Usman Raza",
    email: "usman.agent@echoai.local",
    role: "Agent",
    status: "Inactive",
    lastLogin: "Apr 20, 2026",
    assignedCampaign: "SaaS Expansion Calls",
  },
];

const roleOptions = ["Agent", "Supervisor"] as const;

export default function UserManagementPage() {
  const [users, setUsers] = useState<TeamUser[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Agent" as TeamUser["role"],
    password: "",
  });
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [selectedAccessUser, setSelectedAccessUser] = useState<TeamUser | null>(null);
  const [message, setMessage] = useState("Create users here now; backend persistence will be connected later.");

  const filteredUsers = useMemo(() => {
    const searchText = query.trim().toLowerCase();
    if (!searchText) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role, user.status, user.assignedCampaign].some((value) =>
        value.toLowerCase().includes(searchText)
      )
    );
  }, [query, users]);

  const activeCount = users.filter((user) => user.status === "Active").length;
  const lockedCount = users.filter((user) => user.status === "Locked").length;
  const supervisorCount = users.filter((user) => user.role === "Supervisor").length;
  const agentCount = users.filter((user) => user.role === "Agent").length;

  const createUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = newUser.name.trim();
    const cleanEmail = newUser.email.trim();
    const cleanPassword = newUser.password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setMessage("Please enter name, email, role, and initial password before creating a user.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setMessage("Please enter a valid email address for the new user.");
      return;
    }

    setUsers((currentUsers) => [
      {
        id: Date.now(),
        name: cleanName,
        email: cleanEmail,
        role: newUser.role,
        status: "Active",
        lastLogin: "Invite pending",
        assignedCampaign: newUser.role === "Supervisor" ? "All Campaigns" : "Unassigned",
      },
      ...currentUsers,
    ]);
    setNewUser({ name: "", email: "", role: "Agent", password: "" });
    setMessage(`${cleanName} has been added as an ${newUser.role}. This is saved in the current frontend session only.`);
  };

  const updateStatus = (id: number, status: TeamUser["status"]) => {
    setUsers((currentUsers) => currentUsers.map((user) => (user.id === id ? { ...user, status } : user)));
    setOpenMenuId(null);
    setSelectedAccessUser((currentUser) => (currentUser?.id === id ? { ...currentUser, status } : currentUser));
    const statusMessages = {
      Active: "Account activated and can now access the workspace.",
      Locked: "Account locked. The user cannot log in until an admin unlocks it.",
      Inactive: "Account deactivated without deleting historical data.",
    };
    setMessage(statusMessages[status]);
  };

  const switchRole = (id: number) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              role: user.role === "Agent" ? "Supervisor" : "Agent",
              assignedCampaign: user.role === "Agent" ? "All Campaigns" : "Unassigned",
            }
          : user
      )
    );
    setSelectedAccessUser((currentUser) =>
      currentUser?.id === id
        ? {
            ...currentUser,
            role: currentUser.role === "Agent" ? "Supervisor" : "Agent",
            assignedCampaign: currentUser.role === "Agent" ? "All Campaigns" : "Unassigned",
          }
        : currentUser
    );
    setOpenMenuId(null);
    setMessage("User role updated in the current frontend session.");
  };

  const resetPassword = (user: TeamUser) => {
    setOpenMenuId(null);
    setMessage(`Password reset invite prepared for ${user.email}. Backend email delivery will be connected later.`);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080A13] text-white">
      <div className="flex min-h-screen bg-[radial-gradient(circle_at_24%_12%,rgba(118,107,255,0.14),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(242,167,250,0.08),transparent_30%),#0D0F1A]">
        <AdminSidebar activeKey="users" />

        <main className="flex-1">
          <AdminHeader contextLabel="Users" primaryActionLabel="Open Campaigns" primaryActionHref="/admin/campaigns" showInviteAction={false} />

          <section className="px-5 pb-8 pt-5 md:px-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/42">
                  Admin Users / RBAC Control
                </div>
                <h1 className="mt-2 max-w-[780px] font-headline text-[50px] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
                  User Management
                </h1>
                <p className="mt-4 max-w-[720px] text-[14px] leading-7 text-white/56">
                  Create agents and supervisors, unlock locked accounts, and deactivate users without deleting historical data.
                </p>
              </div>

              <div className="rounded-[16px] border border-white/[0.06] bg-[#111420] px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">RBAC Rule</div>
                <div className="mt-2 text-[14px] font-semibold text-white">Only Admin creates users</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard label="Active Users" value={String(activeCount).padStart(2, "0")} accent="text-[#a7f3c4]" icon={<CheckCircle2 size={17} strokeWidth={2.1} aria-hidden="true" />} />
              <AdminStatCard label="Agents" value={String(agentCount).padStart(2, "0")} accent="text-[#b9b7ff]" icon={<Users size={17} strokeWidth={2.1} aria-hidden="true" />} />
              <AdminStatCard label="Supervisors" value={String(supervisorCount).padStart(2, "0")} accent="text-[#8fdde0]" icon={<ShieldCheck size={17} strokeWidth={2.1} aria-hidden="true" />} />
              <AdminStatCard label="Locked" value={String(lockedCount).padStart(2, "0")} accent="text-[#f6c56f]" icon={<LockKeyhole size={17} strokeWidth={2.1} aria-hidden="true" />} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
              <Card className="!rounded-[20px] !border-[#b9b7ff]/20 !bg-[radial-gradient(circle_at_84%_12%,rgba(185,183,255,0.18),transparent_42%),#111420] !p-5">
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#b9b7ff]/24 bg-[#b9b7ff]/12 text-[#d9dcff]">
                    <UserCog size={19} strokeWidth={2.1} aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">Create New User</div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">
                      Add team member
                    </h2>
                  </div>
                </div>

                <form onSubmit={createUser} className="space-y-4">
                  <AdminFormField label="Full Name" value={newUser.name} onChange={(value) => setNewUser((current) => ({ ...current, name: value }))} />
                  <AdminFormField label="Email Address" value={newUser.email} onChange={(value) => setNewUser((current) => ({ ...current, email: value }))} type="email" />

                  <label className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">Role</span>
                    <div className="grid grid-cols-2 gap-2">
                      {roleOptions.map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewUser((current) => ({ ...current, role }))}
                          className={[
                            "rounded-[12px] border px-3 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors",
                            newUser.role === role
                              ? "border-[#b9b7ff]/36 bg-[#b9b7ff]/16 text-[#d9dcff]"
                              : "border-white/[0.08] bg-white/[0.025] text-white/52 hover:bg-white/[0.05]",
                          ].join(" ")}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </label>

                  <AdminFormField label="Initial Password" value={newUser.password} onChange={(value) => setNewUser((current) => ({ ...current, password: value }))} type="password" />

                  <Button
                    type="submit"
                    fullWidth
                    className="!h-12 !rounded-[12px] !bg-[#b9b7ff] !text-[13px] !font-semibold !uppercase !tracking-[0.12em] !text-[#20264b]"
                    leftIcon={<Plus size={15} strokeWidth={2.2} aria-hidden="true" />}
                  >
                    Create User
                  </Button>
                </form>

                <AdminMessage>{message}</AdminMessage>
              </Card>

              <Card className="!rounded-[20px] !border-white/[0.06] !bg-[#111420] !p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">User Directory</div>
                    <h2 className="mt-1 font-headline text-[28px] font-semibold tracking-[-0.03em] text-white">Agents and supervisors</h2>
                  </div>

                  <label className="relative w-full max-w-[320px]">
                    <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" aria-hidden="true" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search users, role, status..."
                      className="w-full rounded-[10px] border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-4 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#b9b7ff]/36"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-headline text-[22px] font-semibold leading-tight tracking-[-0.03em] text-white">{user.name}</h3>
                            <Badge color={user.role === "Supervisor" ? "secondary" : "primary"} className="!uppercase !tracking-[0.1em]">
                              {user.role}
                            </Badge>
                            <Badge color={user.status === "Active" ? "success" : user.status === "Locked" ? "tertiary" : "neutral"} className="!uppercase !tracking-[0.1em]">
                              {user.status}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-white/46">
                            <span className="inline-flex items-center gap-2">
                              <Mail size={13} strokeWidth={2} aria-hidden="true" />
                              {user.email}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 size={13} strokeWidth={2} aria-hidden="true" />
                              {user.lastLogin}
                            </span>
                          </div>
                          <div className="mt-3 text-[12px] text-white/42">Campaign access: {user.assignedCampaign}</div>

                          {selectedAccessUser?.id === user.id ? (
                            <div className="mt-4 rounded-[15px] border border-[#b9b7ff]/18 bg-[#b9b7ff]/8 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d9dcff]">
                                  <ShieldCheck size={14} strokeWidth={2.1} aria-hidden="true" />
                                  Access details
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedAccessUser(null)}
                                  className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38 hover:text-white/72"
                                >
                                  Close
                                </button>
                              </div>
                              <div className="grid gap-3 lg:grid-cols-3">
                                <AccessField
                                  label="Role Permission"
                                  value={
                                    selectedAccessUser.role === "Supervisor"
                                      ? "Monitor calls, view team analytics, manage escalations"
                                      : "Launch sessions, monitor own calls, manage assigned leads"
                                  }
                                />
                                <AccessField label="Campaign Scope" value={selectedAccessUser.assignedCampaign} />
                                <AccessField
                                  label="Account State"
                                  value={`${selectedAccessUser.status} / ${selectedAccessUser.status === "Active" ? "Login allowed" : "Login blocked"}`}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <AccountStatusActions user={user} onStatusChange={updateStatus} />
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId((current) => (current === user.id ? null : user.id))}
                              className="grid h-9 w-9 place-items-center rounded-[10px] border border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.06]"
                              aria-label={`More actions for ${user.name}`}
                              aria-expanded={openMenuId === user.id}
                            >
                              <MoreHorizontal size={15} strokeWidth={2.1} aria-hidden="true" />
                            </button>

                            {openMenuId === user.id ? (
                              <div className="absolute right-0 top-11 z-40 w-[210px] rounded-[14px] border border-white/10 bg-[#171b28]/98 p-2 shadow-[0_18px_40px_rgba(6,7,14,0.45)] backdrop-blur-xl">
                                <button
                                  type="button"
                                  onClick={() => switchRole(user.id)}
                                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
                                >
                                  <UserCog size={14} strokeWidth={2} aria-hidden="true" />
                                  Change role
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resetPassword(user)}
                                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
                                >
                                  <KeyRound size={14} strokeWidth={2} aria-hidden="true" />
                                  Reset password
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setSelectedAccessUser(user);
                                    setMessage(`Showing access details for ${user.name}.`);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
                                >
                                  <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
                                  View access
                                </button>
                                <div className="my-1 h-px bg-white/[0.08]" />
                                {user.status === "Active" ? (
                                  <>
                                    <MenuAction icon={<LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />} label="Lock account" onClick={() => updateStatus(user.id, "Locked")} />
                                    <MenuAction icon={<UserMinus size={14} strokeWidth={2} aria-hidden="true" />} label="Deactivate" onClick={() => updateStatus(user.id, "Inactive")} />
                                  </>
                                ) : null}
                                {user.status === "Locked" ? (
                                  <>
                                    <MenuAction icon={<KeyRound size={14} strokeWidth={2} aria-hidden="true" />} label="Unlock account" onClick={() => updateStatus(user.id, "Active")} />
                                    <MenuAction icon={<UserMinus size={14} strokeWidth={2} aria-hidden="true" />} label="Deactivate" onClick={() => updateStatus(user.id, "Inactive")} />
                                  </>
                                ) : null}
                                {user.status === "Inactive" ? (
                                  <MenuAction icon={<CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />} label="Activate account" onClick={() => updateStatus(user.id, "Active")} />
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function AccountStatusActions({
  user,
  onStatusChange,
}: {
  user: TeamUser;
  onStatusChange: (id: number, status: TeamUser["status"]) => void;
}) {
  if (user.status === "Active") {
    return (
      <>
        <StatusButton
          label="Lock"
          icon={<LockKeyhole size={14} strokeWidth={2.1} aria-hidden="true" />}
          onClick={() => onStatusChange(user.id, "Locked")}
          className="border-[#f6c56f]/18 bg-[#f6c56f]/10 text-[#f8dc9b]"
        />
        <StatusButton
          label="Deactivate"
          icon={<UserMinus size={14} strokeWidth={2.1} aria-hidden="true" />}
          onClick={() => onStatusChange(user.id, "Inactive")}
          className="border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
        />
      </>
    );
  }

  if (user.status === "Locked") {
    return (
      <>
        <StatusButton
          label="Unlock"
          icon={<KeyRound size={14} strokeWidth={2.1} aria-hidden="true" />}
          onClick={() => onStatusChange(user.id, "Active")}
          className="border-[#a7f3c4]/18 bg-[#a7f3c4]/10 text-[#a7f3c4]"
        />
        <StatusButton
          label="Deactivate"
          icon={<UserMinus size={14} strokeWidth={2.1} aria-hidden="true" />}
          onClick={() => onStatusChange(user.id, "Inactive")}
          className="border-white/10 bg-white/[0.03] text-white/68 hover:bg-white/[0.06]"
        />
      </>
    );
  }

  return (
    <StatusButton
      label="Activate"
      icon={<CheckCircle2 size={14} strokeWidth={2.1} aria-hidden="true" />}
      onClick={() => onStatusChange(user.id, "Active")}
      className="border-[#a7f3c4]/18 bg-[#a7f3c4]/10 text-[#a7f3c4]"
    />
  );
}

function StatusButton({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[10px] font-semibold uppercase tracking-[0.1em] ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function MenuAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-white/78 hover:bg-white/[0.05] hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}

function AccessField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/[0.06] bg-[#111420]/70 p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/36">{label}</div>
      <div className="mt-1 text-[12px] leading-5 text-white/74">{value}</div>
    </div>
  );
}
