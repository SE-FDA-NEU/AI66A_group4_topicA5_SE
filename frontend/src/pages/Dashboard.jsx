import { useAuth } from "../auth";
import ManagerDashboard from "./ManagerDashboard";
import OfficerDashboard from "./OfficerDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  return user.role === "admin" ? <ManagerDashboard /> : <OfficerDashboard />;
}
