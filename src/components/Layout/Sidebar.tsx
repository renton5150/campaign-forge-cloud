import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, List, Filter, FileText, Mail, Upload, Ban, Server } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Contacts', path: '/contacts' },
    { icon: List, label: 'Listes', path: '/contact-lists' },
    { icon: Filter, label: 'Segments', path: '/segments' },
    { icon: FileText, label: 'Templates', path: '/templates' },
    { icon: Mail, label: 'Campagnes', path: '/campaigns' },
    { icon: Upload, label: 'Import', path: '/import' },
    { icon: Ban, label: 'Blacklists', path: '/blacklists' },
    { icon: Server, label: 'Serveurs SMTP', path: '/smtp-servers' },
  ];

  const adminMenuItems = [
    { icon: Users, label: 'Tenants', path: '/tenants' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-white shadow-lg h-screen overflow-y-auto">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-gray-800">GrowthLoop</h1>
      </div>
      <nav className="py-4">
        {menuItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center p-3 hover:bg-gray-100 cursor-pointer ${
              isActive(item.path) ? 'bg-gray-100 font-semibold' : ''
            }`}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon className="w-5 h-5 mr-3 text-gray-500" />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {user?.role === 'super_admin' && (
        <>
          <div className="p-3 font-semibold text-gray-500 uppercase text-xs">
            Administration
          </div>
          <nav className="py-2">
            {adminMenuItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center p-3 hover:bg-gray-100 cursor-pointer ${
                  isActive(item.path) ? 'bg-gray-100 font-semibold' : ''
                }`}
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-500" />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </>
      )}
    </div>
  );
};

export default Sidebar;
