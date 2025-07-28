
export interface SmtpAwareDNSRecord {
  type: string;
  name: string;
  value: string;
  priority?: number;
  description: string;
}

export interface SmtpConfig {
  provider: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
}

export interface SmtpDnsCompatibility {
  isCompatible: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Génère les enregistrements DNS adaptés selon le fournisseur SMTP
 */
export function generateSmtpAwareDNSRecords(
  domainName: string,
  dkimSelector: string,
  dkimPublicKey: string,
  smtpConfig: SmtpConfig
): SmtpAwareDNSRecord[] {
  const records: SmtpAwareDNSRecord[] = [];

  // Enregistrement DKIM (toujours nécessaire)
  records.push({
    type: 'TXT',
    name: `${dkimSelector}._domainkey.${domainName}`,
    value: `v=DKIM1; k=rsa; p=${dkimPublicKey}`,
    description: 'Enregistrement DKIM pour la signature des emails'
  });

  // Enregistrement SPF adapté selon le fournisseur
  let spfRecord = '';
  switch (smtpConfig.provider) {
    case 'sendgrid':
      spfRecord = 'v=spf1 include:sendgrid.net ~all';
      break;
    case 'mailgun':
      spfRecord = 'v=spf1 include:mailgun.org ~all';
      break;
    case 'amazon_ses':
      spfRecord = 'v=spf1 include:amazonses.com ~all';
      break;
    default:
      spfRecord = 'v=spf1 include:_spf.your-platform.com ~all';
  }

  records.push({
    type: 'TXT',
    name: domainName,
    value: spfRecord,
    description: `Enregistrement SPF pour ${smtpConfig.provider}`
  });

  // Enregistrement DMARC
  records.push({
    type: 'TXT',
    name: `_dmarc.${domainName}`,
    value: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${domainName}`,
    description: 'Politique DMARC pour la protection contre le spoofing'
  });

  // Enregistrements spécifiques selon le fournisseur
  switch (smtpConfig.provider) {
    case 'sendgrid':
      records.push({
        type: 'CNAME',
        name: `em123.${domainName}`,
        value: 'sendgrid.net',
        description: 'CNAME pour SendGrid (remplacez 123 par votre ID)'
      });
      break;
    
    case 'mailgun':
      records.push({
        type: 'TXT',
        name: domainName,
        value: 'v=spf1 include:mailgun.org ~all',
        description: 'Enregistrement SPF pour Mailgun'
      });
      records.push({
        type: 'CNAME',
        name: `email.${domainName}`,
        value: 'mailgun.org',
        description: 'CNAME pour Mailgun'
      });
      break;
    
    case 'amazon_ses':
      records.push({
        type: 'TXT',
        name: `_amazonses.${domainName}`,
        value: 'amazon-ses-verification-token',
        description: 'Token de vérification Amazon SES'
      });
      break;
  }

  return records;
}

/**
 * Valide la compatibilité entre la configuration SMTP et les DNS
 */
export function validateSmtpDnsCompatibility(
  smtpConfig: SmtpConfig,
  dnsRecords: SmtpAwareDNSRecord[]
): SmtpDnsCompatibility {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Vérifier que l'email expéditeur correspond au domaine
  const fromEmailDomain = smtpConfig.fromEmail.split('@')[1];
  const hasDomainMatch = dnsRecords.some(record => 
    record.name.includes(fromEmailDomain) || record.name === fromEmailDomain
  );

  if (!hasDomainMatch) {
    issues.push('Email expéditeur ne correspond pas aux domaines DNS configurés');
  }

  // Vérifications spécifiques par fournisseur
  switch (smtpConfig.provider) {
    case 'sendgrid':
      const hasSendGridSPF = dnsRecords.some(record => 
        record.value.includes('sendgrid.net')
      );
      if (!hasSendGridSPF) {
        issues.push('Enregistrement SPF SendGrid manquant');
        recommendations.push('Ajoutez "include:sendgrid.net" à votre enregistrement SPF');
      }
      break;
    
    case 'mailgun':
      const hasMailgunSPF = dnsRecords.some(record => 
        record.value.includes('mailgun.org')
      );
      if (!hasMailgunSPF) {
        issues.push('Enregistrement SPF Mailgun manquant');
        recommendations.push('Ajoutez "include:mailgun.org" à votre enregistrement SPF');
      }
      break;
    
    case 'amazon_ses':
      const hasSesSPF = dnsRecords.some(record => 
        record.value.includes('amazonses.com')
      );
      if (!hasSesSPF) {
        issues.push('Enregistrement SPF Amazon SES manquant');
        recommendations.push('Ajoutez "include:amazonses.com" à votre enregistrement SPF');
      }
      break;
  }

  // Vérifier la présence des enregistrements essentiels
  const hasDKIM = dnsRecords.some(record => record.name.includes('._domainkey.'));
  const hasSPF = dnsRecords.some(record => record.value.startsWith('v=spf1'));
  const hasDMARC = dnsRecords.some(record => record.name.includes('_dmarc.'));

  if (!hasDKIM) issues.push('Enregistrement DKIM manquant');
  if (!hasSPF) issues.push('Enregistrement SPF manquant');
  if (!hasDMARC) issues.push('Enregistrement DMARC manquant');

  return {
    isCompatible: issues.length === 0,
    issues,
    recommendations
  };
}
