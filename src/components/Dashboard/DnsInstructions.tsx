
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { DNSRecords } from '@/hooks/useSendingDomains';

interface DnsInstructionsProps {
  open: boolean;
  onClose: () => void;
  domainName: string;
  dnsRecords: DNSRecords;
}

export function DnsInstructions({ open, onClose, domainName, dnsRecords }: DnsInstructionsProps) {
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);

  const copyToClipboard = (text: string, recordName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordName);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const records = [
    {
      name: 'DKIM (Authentification)',
      type: 'TXT',
      host: dnsRecords.dkim.host,
      value: dnsRecords.dkim.value,
      description: 'Permet la signature cryptographique de vos emails',
      icon: '🔑'
    },
    {
      name: 'SPF (Autorisation d\'envoi)',
      type: 'TXT',
      host: dnsRecords.spf.host,
      value: dnsRecords.spf.value,
      description: 'Autorise les serveurs à envoyer des emails pour votre domaine',
      icon: '✅'
    },
    {
      name: 'DMARC (Politique)',
      type: 'TXT',
      host: dnsRecords.dmarc.host,
      value: dnsRecords.dmarc.value,
      description: 'Définit la politique de traitement des emails non conformes',
      icon: '🛡️'
    },
    {
      name: 'Vérification',
      type: 'TXT',
      host: dnsRecords.verification.host,
      value: dnsRecords.verification.value,
      description: 'Token de vérification pour confirmer la propriété du domaine',
      icon: '🔍'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            📋 Enregistrements DNS pour {domainName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
            <p className="text-blue-800 text-sm">
              Ajoutez ces enregistrements DNS dans votre zone DNS pour configurer 
              l'authentification email (SPF, DKIM, DMARC) et vérifier la propriété du domaine.
            </p>
          </div>

          <div className="space-y-4">
            {records.map((record, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{record.icon}</span>
                    <span className="font-medium">{record.name}</span>
                    <Badge variant="outline">{record.type}</Badge>
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
                
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Nom/Host:</p>
                    <div className="bg-gray-50 p-2 rounded font-mono text-sm break-all">
                      {record.host}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-700">Valeur:</p>
                    <div className="bg-gray-50 p-2 rounded font-mono text-sm break-all">
                      {record.value}
                    </div>
                  </div>
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
              <li>• Testez la vérification après avoir ajouté tous les enregistrements</li>
              <li>• Seuls les domaines vérifiés pourront être utilisés pour l'envoi</li>
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
