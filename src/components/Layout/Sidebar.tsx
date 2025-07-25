
import React from 'react';
import { Home, Users, Globe, Mail, ListChecks, FileText, Shield, Settings, Filter, Upload } from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  return (
    <aside className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">CRM Emailing</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-4">
        <ul>
          <li className="mb-2">
            <NavLink
              to="/dashboard"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'dashboard' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('dashboard')}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/campaigns"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'campaigns' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('campaigns')}
            >
              <Mail className="mr-2 h-4 w-4" />
              Campagnes
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/contacts"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'contacts' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('contacts')}
            >
              <Users className="mr-2 h-4 w-4" />
              Contacts
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/contact-lists"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'contacts-lists' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('contacts-lists')}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              Listes de contacts
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/segments"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'contacts-segments' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('contacts-segments')}
            >
              <Filter className="mr-2 h-4 w-4" />
              Segments
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/templates"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'templates' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('templates')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/import"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'contacts-import' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('contacts-import')}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/blacklists"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'contacts-blacklists' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('contacts-blacklists')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Blacklists
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/smtp-servers"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'smtp-servers' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('smtp-servers')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Serveurs SMTP
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/tenants"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'tenants' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('tenants')}
            >
              <Globe className="mr-2 h-4 w-4" />
              Tenants
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/users"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'users' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('users')}
            >
              <Users className="mr-2 h-4 w-4" />
              Utilisateurs
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/domains"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'domains' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('domains')}
            >
              <Globe className="mr-2 h-4 w-4" />
              Domaines
            </NavLink>
          </li>
          <li className="mb-2">
            <NavLink
              to="/roles"
              className={`flex items-center p-2 rounded-md hover:bg-gray-700 ${currentPage === 'roles' ? 'bg-gray-700' : ''}`}
              onClick={() => onPageChange('roles')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Roles
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
