// src/components/BottomNav.jsx
import { NavLink, useLocation } from "react-router-dom";

export default function BottomNav() {
  const location = useLocation();

  // Only show on client pages (tweak these prefixes to match your routes)
  const clientRoutes = ["/client", "/progress", "/my-exercises"];
  const isClientRoute = clientRoutes.some(p =>
    location.pathname.startsWith(p)
  );

  if (!isClientRoute) return null;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Primary">
      <NavLink to="/client" end className={({ isActive }) => isActive ? "active" : ""}>
        Home
      </NavLink>
      <NavLink to="/progress" className={({ isActive }) => isActive ? "active" : ""}>
        Progress
      </NavLink>
    </nav>
  );
}
