"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { formatMeetingId } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const name = user?.name ?? "Me";

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-64"
      trigger={
        <button type="button" onClick={() => setOpen(!open)} aria-label="Profile menu" className="relative block">
          <Avatar name={name} color={user?.avatar_color} size="sm" className="rounded-lg" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-zoom-green" />
        </button>
      }
    >
      <div className="flex items-center gap-3 border-b border-zoom-border px-3 pb-3 pt-2">
        <Avatar name={name} color={user?.avatar_color} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-zoom-muted">{user?.email}</p>
        </div>
      </div>
      {user && (
        <p className="px-3 py-2 text-xs text-zoom-muted">
          Personal Meeting ID <span className="font-medium text-zoom-text">{formatMeetingId(user.personal_meeting_id)}</span>
        </p>
      )}
      <MenuItem
        icon={<Settings className="h-4 w-4" />}
        onSelect={() => {
          setOpen(false);
          toast("Settings aren't part of this demo");
        }}
      >
        Settings
      </MenuItem>
      <MenuItem
        icon={<LogOut className="h-4 w-4" />}
        onSelect={async () => {
          setOpen(false);
          await logout();
          router.replace("/login");
        }}
      >
        Sign Out
      </MenuItem>
    </Popover>
  );
}
