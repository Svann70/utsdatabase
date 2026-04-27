import { NavLink } from 'react-router-dom'
import { Gamepad2, LayoutDashboard } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <Gamepad2 size={20} />
          RentalPS
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
            Booking
          </NavLink>
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>
            <LayoutDashboard size={12} style={{ marginRight: 3 }} />
            Admin
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
