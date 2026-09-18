"use client";

import * as React from "react";
import { BellRing, MessageCircle, AlertTriangle, CheckCircle } from "lucide-react";

export interface Notification {
  id: number;
  type: "message" | "alert" | "success";
  message: string;
  timestamp?: string;
  read?: boolean;
}

interface NotificationsProps {
  notifications?: Notification[];
  icon?: React.ReactNode;
}

const defaultNotifications: Notification[] = [
  { id: 1, type: "message", message: "New message from John", timestamp: "2m ago" },
  { id: 2, type: "success", message: "Report generated successfully", timestamp: "10m ago" },
  { id: 3, type: "alert", message: "Server downtime scheduled", timestamp: "1h ago" },
];

export default function Notifications({
  notifications = defaultNotifications,
  icon,
}: NotificationsProps) {
  const [open, setOpen] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="w-5 h-5 text-accent" />;
      case "alert":
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-success" />;
      default:
        return <BellRing className="w-5 h-5 text-text-muted" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full border border-border hover:bg-bg-tertiary inline-flex items-center justify-center transition-colors"
      >
        {icon || <BellRing className="w-5 h-5 text-text-muted" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-danger rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 bg-bg-secondary border border-border rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-border">
              <span className="text-sm font-medium text-text-bright">Notifications</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-text-muted text-sm">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 p-3 hover:bg-bg-tertiary cursor-pointer transition-colors ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className="mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex flex-col">
                      <span className="text-sm text-text">{n.message}</span>
                      {n.timestamp && (
                        <span className="text-xs text-text-muted mt-1">{n.timestamp}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
