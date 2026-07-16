"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getNotifications, markNotificationsRead } from "@/app/actions";
import Link from "next/link";

interface Notification {
  id: number;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: Date | string;
}

interface NotificationBellProps {
  userId: number;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Poll every 30s for new notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleOpen = () => {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      // Mark all as read
      startTransition(async () => {
        await markNotificationsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "mention": return "💬";
      case "reply": return "↩️";
      case "vote": return "⬆️";
      default: return "🔔";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        title="Notifications"
        className="relative p-1.5 text-[#949ba4] hover:text-white hover:bg-[#35373c] rounded transition"
        id="notification-bell-btn"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none animate-in zoom-in duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute bottom-10 left-0 w-72 bg-[#111214] border border-[#232428] rounded-lg shadow-2xl z-[999] overflow-hidden animate-in slide-in-from-bottom-3 duration-150">
            <div className="px-4 py-3 border-b border-[#232428] flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">Notifications</h4>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    startTransition(async () => {
                      await markNotificationsRead();
                      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    });
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-2xl mb-2">🔕</span>
                  <p className="text-xs text-[#949ba4]">No notifications yet.</p>
                  <p className="text-[10px] text-[#6b7280] mt-1">Mention someone with @username to notify them!</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    href={notif.link}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#1e1f22] hover:bg-[#1e1f22] transition group ${
                      notif.read ? "opacity-60" : ""
                    }`}
                  >
                    <span className="text-base mt-0.5 flex-shrink-0">{getIcon(notif.type)}</span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className={`text-xs leading-relaxed break-words ${notif.read ? "text-[#949ba4]" : "text-white font-medium"}`}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-[#6b7280]">
                        {new Date(notif.createdAt).toLocaleDateString()} · {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
