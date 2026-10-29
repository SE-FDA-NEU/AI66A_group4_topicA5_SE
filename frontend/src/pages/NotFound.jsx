import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="state">
      <h1>Page not found</h1>
      <p>We couldn't find that page. Check the address or go back to the start.</p>
      <p><Link to="/">Back to home</Link></p>
    </div>
  );
}
