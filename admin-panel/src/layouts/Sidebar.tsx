import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../constants';
import type { SidebarProps } from './types';
import { Upload, ChevronLeft, ChevronRight, LogOut, CreditCard, Users } from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const location = useLocation();

  const links = [
    { name: 'Payments', path: ROUTES.PAYMENT_REQUESTS, icon: <CreditCard size={20} /> },
    { name: 'Referral Activities', path: ROUTES.REFERRAL_ACTIVITIES, icon: <Users size={20} /> },
    { name: 'Upload Place', path: ROUTES.UPLOAD_PLACE, icon: <Upload size={20} /> },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <div
      className={`sidebar ${!isOpen ? 'closed' : ''}`}
      style={{
        width: isOpen ? '250px' : '70px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      <div
        className="sidebar-header"
        style={{
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: isOpen ? '0 1rem' : '0',
        }}
      >
        {isOpen && <h2 style={{ fontSize: '1.25rem', margin: 0 }}>AiGaido</h2>}
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>
      </div>
      <nav className="sidebar-nav" style={{ flex: 1 }}>
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{
                padding: '0.75rem 1.5rem',
                justifyContent: isOpen ? 'flex-start' : 'center',
              }}
            >
              <span
                className="icon"
                style={{
                  marginRight: isOpen ? '1rem' : '0',
                  transition: 'margin 0.3s ease',
                }}
              >
                {link.icon}
              </span>
              <span
                className="text"
                style={{
                  opacity: isOpen ? 1 : 0,
                  maxWidth: isOpen ? '200px' : '0px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }}
              >
                {link.name}
              </span>
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <button
          onClick={handleLogout}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0.75rem',
            justifyContent: isOpen ? 'flex-start' : 'center',
            transition: 'all 0.2s',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <LogOut
            size={20}
            style={{
              marginRight: isOpen ? '1rem' : '0',
              flexShrink: 0,
              transition: 'margin 0.3s ease',
            }}
          />
          <span
            style={{
              fontWeight: 500,
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              opacity: isOpen ? 1 : 0,
              maxWidth: isOpen ? '200px' : '0px',
              overflow: 'hidden',
              transition: 'all 0.3s ease',
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
