import { Link } from "react-router-dom";
import Card from "../components/Card";
import PageHeader from "../components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Card>
        <p>We couldn't find that page. Check the address or go back to the start.</p>
        <p><Link to="/">Back to home</Link></p>
      </Card>
    </>
  );
}
