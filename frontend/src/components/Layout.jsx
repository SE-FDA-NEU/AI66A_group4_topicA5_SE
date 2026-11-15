import NotificationLink from "./NotificationLink";
import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const manager = user.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  const toggleRef = useRef(null);
  const close = () => setMenuOpen(false);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      if (toggleRef.current) toggleRef.current.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return (
    <div className="app-shell">
      <header className={`topbar ${manager ? "manager-bar" : "officer-bar"}${menuOpen ? " menu-open" : ""}`}>
        <Link to="/dashboard" className="brand"><span className="brand-mark">C</span><span>Credit Scoring</span></Link>
        <button type="button" ref={toggleRef} className="menu-toggle" aria-controls="main-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>Menu</button>
        <nav id="main-nav" aria-label="Main navigation" onClick={(e) => { if (e.target.closest("a")) close(); }}>
          <NavLink to="/dashboard">{manager ? "Branch overview" : "My dashboard"}</NavLink>
          <NavLink to="/loan-applications" end>{manager ? "Branch applications" : "My applications"}</NavLink>
          <NavLink to="/loan-applications/new">New application</NavLink>
          {manager && <NotificationLink />}
          {manager && <NavLink to="/admin/users">Employees</NavLink>}
        </nav>
        <div className="topbar-actions">
          <div className="who">
            <span className="user-name"><span className="user-name-text" title={user.full_name}>{user.full_name}</span><span className="role-label">{manager ? "Manager" : "Officer"}</span></span>
            <button className="logout-btn" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
      <footer className="app-footer">Credit Scoring</footer>
    </div>
  );
}
