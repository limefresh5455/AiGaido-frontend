import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import type { AdminLayoutProps } from './types';
import { ROUTES } from '../constants';
import { Menu } from 'lucide-react';

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPageTitle = () => {
    switch (location.pathname) {
      case ROUTES.UPLOAD_PLACE:
        return 'Upload Place';
      case ROUTES.PAYMENT_REQUESTS:
        return 'Payment Requests';
      case ROUTES.REFERRAL_ACTIVITIES:
        return 'Referral Activities';
      default:
        return 'Admin Panel';
    }
  };

  return (
    <div className="layout-container">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="main-content">
        <header className="header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {isMobile && (
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#3b2c85',
                  marginRight: '15px',
                }}
              >
                <Menu size={24} />
              </button>
            )}
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, color: '#3b2c85' }}>
              {getPageTitle()}
            </h1>
          </div>
        </header>
        <main style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>{children}</main>
      </div>

      {isMobile && isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 45 }}
        />
      )}
    </div>
  );
};

export default AdminLayout;
