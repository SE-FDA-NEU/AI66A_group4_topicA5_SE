import EditApplication from "./pages/EditApplication";
import Notifications from "./pages/Notifications";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Card from "./components/Card";
import Layout from "./components/Layout";
import PageHeader from "./components/PageHeader";
import ApplicationDetail from "./pages/ApplicationDetail";
import ApplicationList from "./pages/ApplicationList";
import Dashboard from "./pages/Dashboard";
import NewApplication from "./pages/NewApplication";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Users from "./pages/Users";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? <Layout>{children}</Layout> : <Navigate to="/" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/loan-applications" element={<Protected><ApplicationList /></Protected>} />
      <Route path="/loan-applications/new" element={<Protected><NewApplication /></Protected>} />
      <Route path="/loan-applications/:id/edit" element={<Protected><EditApplication /></Protected>} />
      <Route path="/notifications" element={<Protected>{user?.role === "admin" ? <Notifications /> : <><PageHeader title="Review notifications" /><Card><p>Only a manager can open review notifications.</p></Card></>}</Protected>} />
      <Route path="/loan-applications/:id" element={<Protected><ApplicationDetail /></Protected>} />
      <Route path="/admin/users" element={<Protected>{user?.role === "admin" ? <Users /> : <><PageHeader title="Employee accounts" /><Card><p>You need Manager access to manage employees. Ask your branch manager for help.</p></Card></>}</Protected>} />
      <Route path="*" element={user ? <Layout><NotFound /></Layout> : <main className="page"><NotFound /></main>} />
    </Routes>
  );
}
