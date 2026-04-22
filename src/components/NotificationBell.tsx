"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [animateBell, setAnimateBell] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);

  useEffect(() =>{
    const fetchNotifications = async () =>{
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          const next: string[] = data.notifications || [];
          // ring the bell when new notifications arrive
          if (next.length >prevCount.current) {
            setAnimateBell(true);
            setTimeout(() =>setAnimateBell(false), 700);
          }
          prevCount.current = next.length;
          setNotifications(next);
        }
      } catch {
        /* silently fail */
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () =>clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() =>{
    const onClickOutside = (e: MouseEvent) =>{
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", onClickOutside);
    return () =>document.removeEventListener("mousedown", onClickOutside);
  }, [isOpen]);

  const count = notifications.length;

  return (
    <div className="notif-wrapper" ref={panelRef}>
      {/* ── Bell button ─────────────────────────────────── */}
      <button
        id="notif-bell-btn"
        onClick={() =>setIsOpen((o) =>!o)}
        className={`notif-bell-btn${isOpen ? " notif-bell-btn--active" : ""}`}
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell
          size={20}
          strokeWidth={2}
          className={`notif-bell-icon${animateBell ? " bell-ring" : ""}`}
        />

        {/* Count badge */}
        {count >0 && (
          <span className="notif-badge" aria-label={`${count} notifications`}>
            {count >9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ──────────────────────────────── */}
      {isOpen && (
        <div className="notif-panel glass animate-fade-in" role="menu">
          <div className="notif-panel-header">
            <span className="notif-panel-title">Notifications</span>
            {count >0 && (
              <span className="notif-count-pill">{count} new</span>
            )}
          </div>

          <div className="notif-panel-body">
            {count === 0 ? (
              <div className="notif-empty">
                <Bell size={28} strokeWidth={1.5} style={{ opacity: 0.35, marginBottom: "0.5rem" }} />
                <span>You're all caught up!</span>
              </div>
            ) : (
              <ul className="notif-list">
                {notifications.map((notif, i) =>(
                  <li key={i} className="notif-item">
                    <span className="notif-dot" />
                    <div className="notif-item-body">
                      <p className="notif-text">{notif}</p>
                      <Link
                        href="/dashboard"
                        onClick={() =>setIsOpen(false)}
                        className="notif-link"
                      >
                        View Dashboard →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
