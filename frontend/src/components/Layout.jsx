import NotificationLink from "./NotificationLink";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";

function ThemeIcon({ dark }) {
  return dark
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.8 8.8 0 1 0 20.5 14.2Z" /></svg>;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
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
          <button className="theme-toggle" type="button" onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
            <ThemeIcon dark={theme === "light"} />
            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </button>
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
