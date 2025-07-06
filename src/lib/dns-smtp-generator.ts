
interface SmtpConfig {
  provider: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface SmtpAwareDNSRecord {
  type: string;
  name: string;
  value: string;
  description: string;
  priority?: number;
}

export function generateSmtpAwareDNSRecords(
  domain: string, 
  dkimSelector: string, 
  dkimPublicKey: string, 
  smtpConfig: SmtpConfig
): SmtpAwareDNSRecord[] {
  const records: SmtpAwareDNSRecord[] = [];

  // 1. Enregistrement DKIM (toujours requis)
  records.push({
    type: 'TXT',
    name: `${dkimSelector}._domainkey.${domain}`,
    value: dkimPublicKey || `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFA...`,
    description: 'Enregistrement DKIM pour la signature des emails'
  });

  // 2. Enregistrement SPF adapté au fournisseur
  let spfValue = 'v=spf1 ';
  
  switch (smtpConfig.provider) {
    case 'sendgrid':
      spfValue += 'include:sendgrid.net ';
      break;
    case 'mailgun':
      spfValue += 'include:mailgun.org ';
      break;
    case 'turbosmtp':
      spfValue += 'include:pro.turbo-smtp.com ';
      break;
    case 'amazon_ses':
      spfValue += 'include:amazonses.com ';
      break;
    case 'custom':
      if (smtpConfig.host) {
        // Pour un serveur personnalisé, on inclut l'IP ou le domaine
        spfValue += `include:${smtpConfig.host} `;
      }
      break;
    default:
      spfValue += 'include:_spf.google.com ';
  }
  
  spfValue += '~all';

  records.push({
    type: 'TXT',
    name: domain,
    value: spfValue,
    description: `Enregistrement SPF optimisé pour ${getProviderLabel(smtpConfig.provider)}`
  });

  // 3. Enregistrement DMARC
  records.push({
    type: 'TXT',
    name: `_dmarc.${domain}`,
    value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}; ruf=mailto:dmarc@${domain}; fo=1`,
    description: 'Politique DMARC pour la protection contre le spoofing'
  });

  // 4. Enregistrements spécifiques au fournisseur
  const providerRecords = getProviderSpecificRecords(domain, smtpConfig);
  records.push(...providerRecords);

  return records;
}

function getProviderSpecificRecords(domain: string, smtpConfig: SmtpConfig): SmtpAwareDNSRecord[] {
  const records: SmtpAwareDNSRecord[] = [];

  switch (smtpConfig.provider) {
    case 'sendgrid':
      // SendGrid demande parfois des enregistrements CNAME
      records.push({
        type: 'CNAME',
        name: `em123.${domain}`,
        value: 'u123456.wl.sendgrid.net',
        description: 'Enregistrement de lien SendGrid (remplacez 123456 par votre ID)'
      });
      break;

    case 'mailgun':
      // Mailgun utilise des sous-domaines dédiés
      records.push({
        type: 'TXT',
        name: `smtp._domainkey.${domain}`,
        value: 'k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
        description: 'Clé DKIM Mailgun (à remplacer par votre clé réelle)'
      });
      break;

    case 'turbosmtp':
      // TurboSMTP configuration spéciale
      records.push({
        type: 'TXT',
        name: `turbo._domainkey.${domain}`,
        value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
        description: 'Clé DKIM TurboSMTP'
      });
      break;
  }

  return records;
}

function getProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    'sendgrid': 'SendGrid',
    'mailgun': 'Mailgun',
    'turbosmtp': 'TurboSMTP',
    'amazon_ses': 'Amazon SES',
    'custom': 'Serveur personnalisé'
  };
  
  return labels[provider] || provider;
}

export function validateSmtpDnsCompatibility(
  smtpConfig: SmtpConfig, 
  existingRecords: SmtpAwareDNSRecord[]
): { isCompatible: boolean; issues: string[] } {
  const issues: string[] = [];

  // Vérifier la cohérence SPF
  const spfRecord = existingRecords.find(r => r.type === 'TXT' && r.value.startsWith('v=spf1'));
  if (spfRecord) {
    const expectedIncludes = getExpectedSpfIncludes(smtpConfig.provider);
    const hasCorrectInclude = expectedIncludes.some(include => 
      spfRecord.value.includes(include)
    );
    
    if (!hasCorrectInclude) {
      issues.push(`L'enregistrement SPF ne correspond pas au fournisseur ${getProviderLabel(smtpConfig.provider)}`);
    }
  }

  // Vérifier les enregistrements spécifiques au fournisseur
  const requiredRecords = getProviderSpecificRecords('example.com', smtpConfig);
  for (const required of requiredRecords) {
    const exists = existingRecords.some(r => 
      r.type === required.type && r.name.includes(required.name.split('.')[0])
    );
    
    if (!exists) {
      issues.push(`Enregistrement ${required.type} manquant pour ${getProviderLabel(smtpConfig.provider)}`);
    }
  }

  return {
    isCompatible: issues.length === 0,
    issues
  };
}

function getExpectedSpfIncludes(provider: string): string[] {
  const includes: Record<string, string[]> = {
    'sendgrid': ['sendgrid.net'],
    'mailgun': ['mailgun.org'],
    'turbosmtp': ['pro.turbo-smtp.com'],
    'amazon_ses': ['amazonses.com']
  };
  
  return includes[provider] || [];
}
