
export interface DNSVerificationResult {
  dkim: {
    exists: boolean;
    value?: string;
    error?: string;
  };
  spf: {
    exists: boolean;
    value?: string;
    error?: string;
  };
  dmarc: {
    exists: boolean;
    value?: string;
    error?: string;
  };
  overall: 'verified' | 'partial' | 'failed';
}

interface DNSResponse {
  Status: number;
  Answer?: Array<{
    name: string;
    type: number;
    data: string;
  }>;
}

async function queryDNS(domain: string, type: string = 'TXT'): Promise<string[]> {
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        {
          headers: {
            'Accept': 'application/dns-json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DNSResponse = await response.json();

      if (data.Status !== 0) {
        throw new Error(`DNS query failed with status: ${data.Status}`);
      }

      if (!data.Answer || data.Answer.length === 0) {
        return [];
      }

      // Filter TXT records and clean up the data
      return data.Answer
        .filter(record => record.type === 16) // TXT records
        .map(record => record.data.replace(/^"|"$/g, '').replace(/\\"/g, '"'));

    } catch (error) {
      console.warn(`DNS query attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  return [];
}

async function verifyDKIM(domain: string, selector: string): Promise<{ exists: boolean; value?: string; error?: string }> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await queryDNS(dkimDomain);
    
    const dkimRecord = records.find(record => 
      record.startsWith('v=DKIM1') || record.includes('k=rsa') || record.includes('p=')
    );

    if (dkimRecord) {
      return { exists: true, value: dkimRecord };
    } else {
      return { exists: false, error: 'Enregistrement DKIM non trouvé' };
    }
  } catch (error) {
    return { 
      exists: false, 
      error: `Erreur lors de la vérification DKIM: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
}

async function verifySPF(domain: string): Promise<{ exists: boolean; value?: string; error?: string }> {
  try {
    const records = await queryDNS(domain);
    
    const spfRecord = records.find(record => 
      record.startsWith('v=spf1') || record.includes('v=spf1')
    );

    if (spfRecord) {
      return { exists: true, value: spfRecord };
    } else {
      return { exists: false, error: 'Enregistrement SPF non trouvé' };
    }
  } catch (error) {
    return { 
      exists: false, 
      error: `Erreur lors de la vérification SPF: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
}

async function verifyDMARC(domain: string): Promise<{ exists: boolean; value?: string; error?: string }> {
  try {
    const dmarcDomain = `_dmarc.${domain}`;
    const records = await queryDNS(dmarcDomain);
    
    const dmarcRecord = records.find(record => 
      record.startsWith('v=DMARC1') || record.includes('v=DMARC1')
    );

    if (dmarcRecord) {
      return { exists: true, value: dmarcRecord };
    } else {
      return { exists: false, error: 'Enregistrement DMARC non trouvé' };
    }
  } catch (error) {
    return { 
      exists: false, 
      error: `Erreur lors de la vérification DMARC: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    };
  }
}

export async function verifyDomainDNS(domain: string, dkimSelector: string): Promise<DNSVerificationResult> {
  console.log(`🔍 Début vérification DNS pour ${domain} avec sélecteur ${dkimSelector}`);
  
  try {
    // Exécuter les vérifications en parallèle pour plus d'efficacité
    const [dkimResult, spfResult, dmarcResult] = await Promise.all([
      verifyDKIM(domain, dkimSelector),
      verifySPF(domain),
      verifyDMARC(domain)
    ]);

    console.log('📊 Résultats DNS:', { dkimResult, spfResult, dmarcResult });

    // Déterminer le statut global
    const verifiedCount = [dkimResult.exists, spfResult.exists, dmarcResult.exists].filter(Boolean).length;
    let overall: 'verified' | 'partial' | 'failed';

    if (verifiedCount === 3) {
      overall = 'verified';
    } else if (verifiedCount >= 1) {
      overall = 'partial';
    } else {
      overall = 'failed';
    }

    const result: DNSVerificationResult = {
      dkim: dkimResult,
      spf: spfResult,
      dmarc: dmarcResult,
      overall
    };

    console.log('✅ Vérification DNS terminée:', result);
    return result;

  } catch (error) {
    console.error('❌ Erreur lors de la vérification DNS:', error);
    
    return {
      dkim: { exists: false, error: 'Erreur de vérification' },
      spf: { exists: false, error: 'Erreur de vérification' },
      dmarc: { exists: false, error: 'Erreur de vérification' },
      overall: 'failed'
    };
  }
}
