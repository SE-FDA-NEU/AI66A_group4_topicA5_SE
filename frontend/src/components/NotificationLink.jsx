import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

export default function NotificationLink() {
  const { user } = useAuth();
  const [count, setCount] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true, version = 0;
    const load = async () => {
      const request = ++version;
      try {
        const data = await api.notifications();
        if (active && request === version) { setCount(data.unread_count); setFailed(false); }
      } catch {
        if (active && request === version) setFailed(true);
      }
    };
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    // 30 seconds is comfortably within US07's five-minute requirement.
    const timer = setInterval(visible, 30_000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("notifications-changed", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("notifications-changed", load);
    };
  }, [user.id]);
  return <NavLink to="/notifications" title={failed ? "Open notifications to retry loading the unread count." : undefined}>
    Notifications{failed ? " (?)" : count == null ? "" : ` (${count})`}
  </NavLink>;
}
