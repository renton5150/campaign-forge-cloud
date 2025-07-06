import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Domain } from '@/types/database';

interface DNSInstructionsModalProps {
  domain: Domain;
  open: boolean;
  onClose: () => void;
}

export function DNSInstructionsModal({ domain, open, onClose }: DNSInstructionsModalProps) {
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const dnsRecords = [
    {
      type: 'TXT',
      name: `${domain.dkim_selector || 'default'}._domainkey.${domain.domain_name}`,
      value: domain.dkim_public_key || 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFA...',
      description: 'Enregistrement DKIM pour la signature des emails'
    },
    {
      type: 'TXT',
      name: domain.domain_name,
      value: 'v=spf1 include:_spf.google.com ~all',
      description: 'Enregistrement SPF pour autoriser les serveurs d\'envoi'
    },
    {
      type: 'TXT',
      name: `_dmarc.${domain.domain_name}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain.domain_name}`,
      description: 'Politique DMARC pour la protection contre le spoofing'
    }
  ];

  const copyToClipboard = (text: string, recordName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordName);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Instructions DNS pour {domain.domain_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
            <p className="text-blue-800 text-sm">
              Ajoutez ces enregistrements DNS dans votre zone DNS pour configurer 
              l'authentification email (SPF, DKIM, DMARC).
            </p>
          </div>

          <div className="space-y-4">
            {dnsRecords.map((record, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{record.type}</Badge>
                    <span className="font-medium">{record.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(record.value, record.name)}
                  >
                    {copiedRecord === record.name ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
                  {record.value}
                </div>
                
                <p className="text-sm text-gray-600 mt-2">
                  {record.description}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h4>
            <ul className="text-yellow-800 text-sm space-y-1">
              <li>• La propagation DNS peut prendre jusqu'à 24-48 heures</li>
              <li>• Vérifiez les enregistrements avec un outil comme dig ou nslookup</li>
              <li>• Testez l'envoi d'emails après la propagation</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
