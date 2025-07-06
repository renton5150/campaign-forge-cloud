export interface DKIMKeys {
  privateKey: string;
  publicKey: string;
  selector: string;
}

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

function generateBase64Key(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateDKIMKeyPair(): DKIMKeys {
  const timestamp = Date.now();
  const selector = `dk${timestamp}`;
  
  const privateKeyContent = generateBase64Key(200);
  const publicKeyContent = generateBase64Key(200);
  
  const privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${privateKeyContent}\n-----END RSA PRIVATE KEY-----`;
  const publicKey = `v=DKIM1; k=rsa; p=${publicKeyContent}`;

  return {
    privateKey,
    publicKey,
    selector
  };
}

export function generateDNSRecords(domain: string, publicKey: string): DNSRecord[] {
  const timestamp = Date.now();
  const selector = `dk${timestamp}`;
  
  return [
    {
      type: 'TXT',
      name: `${selector}._domainkey.${domain}`,
      value: publicKey || `v=DKIM1; k=rsa; p=${generateBase64Key(200)}`,
      description: 'Enregistrement DKIM pour la signature des emails'
    },
    {
      type: 'TXT',
      name: domain,
      value: 'v=spf1 include:_spf.google.com ~all',
      description: 'Enregistrement SPF pour autoriser les serveurs d\'envoi'
    },
    {
      type: 'TXT',
      name: `_dmarc.${domain}`,
      value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}`,
      description: 'Politique DMARC pour la protection contre le spoofing'
    }
  ];
}
