import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Globe, CheckCircle } from 'lucide-react';

interface DashboardStats {
  tenants: number;
  users: number;
  domains: number;
  verifiedDomains: number;
}

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    tenants: 0,
    users: 0,
    domains: 0,
    verifiedDomains: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const promises = [];

      // Super admin can see all stats
      if (user?.role === 'super_admin') {
        promises.push(
          supabase.from('tenants').select('id', { count: 'exact', head: true }),
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('domains').select('id', { count: 'exact', head: true }),
          supabase.from('domains').select('id', { count: 'exact', head: true }).eq('verified', true)
        );
      } else {
        // Other users see only their tenant's stats
        promises.push(
          Promise.resolve({ count: 1 }), // Current tenant
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('tenant_id', user?.tenant_id),
          supabase.from('domains').select('id', { count: 'exact', head: true }).eq('tenant_id', user?.tenant_id),
          supabase.from('domains').select('id', { count: 'exact', head: true }).eq('tenant_id', user?.tenant_id).eq('verified', true)
        );
      }

      const [tenantsRes, usersRes, domainsRes, verifiedDomainsRes] = await Promise.all(promises);

      setStats({
        tenants: tenantsRes.count || 0,
        users: usersRes.count || 0,
        domains: domainsRes.count || 0,
        verifiedDomains: verifiedDomainsRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const statsCards = [
    {
      title: user?.role === 'super_admin' ? 'Total Tenants' : 'Mon Tenant',
      value: stats.tenants,
      description: user?.role === 'super_admin' ? 'Clients actifs' : 'Entreprise connectée',
      icon: Building2,
      show: true
    },
    {
      title: 'Utilisateurs',
      value: stats.users,
      description: user?.role === 'super_admin' ? 'Tous les utilisateurs' : 'Utilisateurs de mon tenant',
      icon: Users,
      show: true
    },
    {
      title: 'Domaines',
      value: stats.domains,
      description: 'Domaines configurés',
      icon: Globe,
      show: true
    },
    {
      title: 'Domaines Vérifiés',
      value: stats.verifiedDomains,
      description: 'Domaines opérationnels',
      icon: CheckCircle,
      show: true
    }
  ];

  if (loading) {
    return <div className="p-6">Chargement du dashboard...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Bienvenue, {user?.full_name} - 
          <span className="capitalize"> {user?.role?.replace('_', ' ')}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards
          .filter(card => card.show)
          .map((card, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activité Récente</CardTitle>
            <CardDescription>
              Les dernières actions sur la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Aucune activité récente à afficher pour le moment.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>État du Système</CardTitle>
            <CardDescription>
              Status de vos services d'emailing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Service SMTP</span>
                <span className="text-sm text-green-600">Opérationnel</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Base de données</span>
                <span className="text-sm text-green-600">Opérationnel</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API</span>
                <span className="text-sm text-green-600">Opérationnel</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
