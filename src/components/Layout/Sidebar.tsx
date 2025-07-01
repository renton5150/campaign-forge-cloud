
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, 
  Users, 
  Globe, 
  BarChart3, 
  Settings, 
  LogOut,
  Mail,
  List,
  Upload,
  Shield,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const Sidebar = ({ currentPage, onPageChange }: SidebarProps) => {
  const { user, signOut } = useAuth();
  const [contactsExpanded, setContactsExpanded] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      id: 'dashboard',
      icon: BarChart3,
      show: true
    },
    {
      name: 'Campagnes',
      id: 'campaigns',
      icon: Mail,
      show: true
    },
    {
      name: 'Contacts',
      id: 'contacts',
      icon: Users,
      show: true,
      hasSubMenu: true,
      subItems: [
        { name: 'Dashboard', id: 'contacts', icon: BarChart3 },
        { name: 'Listes', id: 'contacts-lists', icon: List },
        { name: 'Import', id: 'contacts-import', icon: Upload },
        { name: 'Blacklists', id: 'contacts-blacklists', icon: Shield },
        { name: 'Segments', id: 'contacts-segments', icon: Filter },
      ]
    },
    {
      name: 'Tenants',
      id: 'tenants',
      icon: Building2,
      show: user?.role === 'super_admin'
    },
    {
      name: 'Utilisateurs',
      id: 'users',
      icon: Users,
      show: user?.role === 'super_admin' || user?.role === 'tenant_admin'
    },
    {
      name: 'Domaines',
      id: 'domains',
      icon: Globe,
      show: true
    },
    {
      name: 'Rôles',
      id: 'roles',
      icon: Settings,
      show: user?.role === 'super_admin' || user?.role === 'tenant_admin'
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div className="text-white font-bold text-lg">EmailPlatform</div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800">
        <div className="text-sm text-gray-300">
          Connecté en tant que
        </div>
        <div className="text-white font-medium">{user?.full_name}</div>
        <div className="text-xs text-gray-400 capitalize">
          {user?.role?.replace('_', ' ')}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation
            .filter(item => item.show)
            .map((item) => (
              <li key={item.id}>
                {item.hasSubMenu ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between text-left",
                        currentPage.startsWith(item.id) 
                          ? "bg-gray-800 text-white" 
                          : "text-gray-300 hover:text-white hover:bg-gray-800"
                      )}
                      onClick={() => {
                        if (item.id === 'contacts') {
                          setContactsExpanded(!contactsExpanded);
                        }
                      }}
                    >
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-4 w-4" />
                        {item.name}
                      </div>
                      {item.id === 'contacts' && (
                        contactsExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    
                    {item.id === 'contacts' && contactsExpanded && (
                      <ul className="ml-6 mt-2 space-y-1">
                        {item.subItems?.map((subItem) => (
                          <li key={subItem.id}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full justify-start text-left",
                                currentPage === subItem.id
                                  ? "bg-gray-700 text-white"
                                  : "text-gray-400 hover:text-white hover:bg-gray-700"
                              )}
                              onClick={() => onPageChange(subItem.id)}
                            >
                              <subItem.icon className="mr-3 h-3 w-3" />
                              {subItem.name}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Button
                    variant={currentPage === item.id ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start text-left",
                      currentPage === item.id 
                        ? "bg-gray-800 text-white" 
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    )}
                    onClick={() => onPageChange(item.id)}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                )}
              </li>
            ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
