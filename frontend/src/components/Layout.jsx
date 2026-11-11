import NotificationLink from "./NotificationLink";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const manager = user.role === "admin";
  return (
    <>
      <header className={`topbar ${manager ? "manager-bar" : "officer-bar"}`}>
        <Link to="/dashboard" className="brand">Credit Scoring</Link>
        <nav>
          <NavLink to="/dashboard">{manager ? "Branch overview" : "My dashboard"}</NavLink>
          <NavLink to="/loan-applications" end>{manager ? "Branch applications" : "My applications"}</NavLink>
          <NavLink to="/loan-applications/new">New application</NavLink>
          {manager && <NotificationLink />}
          {manager && <NavLink to="/admin/users">Employees</NavLink>}
        </nav>
        <div className="who">
          <span>{user.full_name} <span className="role-label">{manager ? "Manager" : "Officer"}</span></span>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="page">{children}</main>
    </>
  );
}
