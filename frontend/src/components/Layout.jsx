import NotificationLink from "./NotificationLink";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const manager = user.role === "admin";
  return (
    <div className="app-shell">
      <header className={`topbar ${manager ? "manager-bar" : "officer-bar"}`}>
        <Link to="/dashboard" className="brand"><span className="brand-mark">C</span><span>Credit Scoring</span></Link>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">{manager ? "Branch overview" : "My dashboard"}</NavLink>
          <NavLink to="/loan-applications" end>{manager ? "Branch applications" : "My applications"}</NavLink>
          <NavLink to="/loan-applications/new">New application</NavLink>
          {manager && <NotificationLink />}
          {manager && <NavLink to="/admin/users">Employees</NavLink>}
        </nav>
        <div className="topbar-actions">
          <div className="who">
            <span className="user-name">{user.full_name}<span className="role-label">{manager ? "Manager" : "Officer"}</span></span>
            <button className="logout-btn" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
      <footer className="app-footer">Credit Scoring <span>•</span> Risk insights for better decisions</footer>
    </div>
  );
}
