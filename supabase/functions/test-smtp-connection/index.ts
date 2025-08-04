import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface SmtpTestRequest {
  type: 'smtp' | 'sendgrid' | 'mailgun' | 'amazon_ses';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  api_key?: string;
  domain?: string;
  region?: string;
  encryption?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// DIAGNOSTIC RÉSEAU COMPLET pour identifier les problèmes de connectivité
async function diagnosticNetwork(host: string, port: number): Promise<string> {
  const diagnostics: string[] = [];
  
  try {
    // Test 1: Résolution DNS
    diagnostics.push(`🔍 Test DNS pour ${host}:`);
    try {
      const dnsLookup = await fetch(`https://dns.google/resolve?name=${host}&type=A`);
      const dnsResult = await dnsLookup.json();
      if (dnsResult.Answer) {
        const ips = dnsResult.Answer.map((a: any) => a.data).join(', ');
        diagnostics.push(`✅ DNS OK: ${host} → ${ips}`);
      } else {
        diagnostics.push(`❌ DNS ÉCHEC: ${host} ne résout pas`);
        return diagnostics.join('\n');
      }
    } catch (e) {
      diagnostics.push(`❌ DNS ERROR: ${e.message}`);
    }

    // Test 2: Connexion TCP basique
    diagnostics.push(`\n🔌 Test connexion TCP ${host}:${port}:`);
    const tcpStart = Date.now();
    
    try {
      const tcpSocket = await Promise.race([
        Deno.connect({ hostname: host, port: port }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('TCP_TIMEOUT')), 5000)
        )
      ]) as Deno.Conn;
      
      const tcpTime = Date.now() - tcpStart;
      diagnostics.push(`✅ TCP OK: Connexion établie en ${tcpTime}ms`);
      tcpSocket.close();
      
    } catch (error) {
      const tcpTime = Date.now() - tcpStart;
      if (error.message === 'TCP_TIMEOUT') {
        diagnostics.push(`❌ TCP TIMEOUT: Aucune réponse après 5000ms`);
      } else {
        diagnostics.push(`❌ TCP ÉCHEC: ${error.message} (${tcpTime}ms)`);
      }
      return diagnostics.join('\n');
    }

    // Test 3: Connexion SSL si port 465
    if (port === 465) {
      diagnostics.push(`\n🔐 Test connexion SSL ${host}:${port}:`);
      const sslStart = Date.now();
      
      try {
        const sslSocket = await Promise.race([
          Deno.connectTls({ hostname: host, port: port }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SSL_TIMEOUT')), 8000)
          )
        ]) as Deno.TlsConn;
        
        const sslTime = Date.now() - sslStart;
        diagnostics.push(`✅ SSL OK: Connexion TLS établie en ${sslTime}ms`);
        sslSocket.close();
        
      } catch (error) {
        const sslTime = Date.now() - sslStart;
        diagnostics.push(`❌ SSL ÉCHEC: ${error.message} (${sslTime}ms)`);
        return diagnostics.join('\n');
      }
    }

    // Test 4: Test SMTP Welcome Message
    diagnostics.push(`\n📧 Test message SMTP welcome:`);
    const smtpStart = Date.now();
    
    try {
      const smtpSocket = port === 465 
        ? await Deno.connectTls({ hostname: host, port: port })
        : await Deno.connect({ hostname: host, port: port });
      
      // Lire le message de bienvenue avec timeout court
      const buffer = new Uint8Array(1024);
      const welcomePromise = smtpSocket.read(buffer);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WELCOME_TIMEOUT')), 3000)
      );
      
      const bytesRead = await Promise.race([welcomePromise, timeoutPromise]) as number;
      const welcome = new TextDecoder().decode(buffer.subarray(0, bytesRead || 0));
      
      const smtpTime = Date.now() - smtpStart;
      if (welcome.startsWith('220')) {
        diagnostics.push(`✅ SMTP OK: ${welcome.trim()} (${smtpTime}ms)`);
      } else {
        diagnostics.push(`⚠️  SMTP INATTENDU: ${welcome.trim()} (${smtpTime}ms)`);
      }
      
      smtpSocket.close();
      
    } catch (error) {
      const smtpTime = Date.now() - smtpStart;
      diagnostics.push(`❌ SMTP ÉCHEC: ${error.message} (${smtpTime}ms)`);
    }

    return diagnostics.join('\n');
    
  } catch (error) {
    diagnostics.push(`❌ DIAGNOSTIC GÉNÉRAL ÉCHEC: ${error.message}`);
    return diagnostics.join('\n');
  }
}

// FONCTION CORRIGÉE pour OVH/7TIC : Parsing SMTP multi-lignes
async function sendCommand(
  socket: Deno.TlsConn | Deno.Conn, 
  command: string, 
  expectedCode: string,
  timeoutMs: number = 8000
): Promise<string> {
  console.log(`📤 Envoi: ${command.trim()}`);
  
  // Envoyer la commande
  const encoder = new TextEncoder();
  await socket.write(encoder.encode(command + '\r\n'));
  
  // Lire la réponse avec timeout
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
  );
  
  const responsePromise = (async () => {
    let fullResponse = '';
    const buffer = new Uint8Array(4096);
    const decoder = new TextDecoder();
    
    while (true) {
      const bytesRead = await socket.read(buffer);
      if (!bytesRead) break;
      
      const chunk = decoder.decode(buffer.subarray(0, bytesRead));
      fullResponse += chunk;
      
      // SPÉCIFIQUE OVH : Vérifier fin de réponse multi-ligne
      const lines = fullResponse.split('\r\n').filter(line => line.length > 0);
      
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        
        // Une réponse SMTP est complète si :
        // - Elle se termine par un code suivi d'un espace (ex: "250 OK")
        // - Ou si c'est une réponse simple sur une ligne
        if (lastLine.match(/^\d{3}\s/) || !lastLine.includes('-')) {
          break;
        }
      }
    }
    
    return fullResponse.trim();
  })();
  
  const response = await Promise.race([responsePromise, timeoutPromise]);
  console.log(`📥 Reçu: ${response}`);
  
  // CORRECTION : Vérifier le code dans n'importe quelle ligne
  const lines = response.split('\r\n');
  const hasValidCode = lines.some(line => {
    const trimmedLine = line.trim();
    // Accepter format : "250 OK", "250-INFO", "334 AUTH"
    return trimmedLine.startsWith(expectedCode + ' ') || 
           trimmedLine.startsWith(expectedCode + '-');
  });
  
  if (!hasValidCode) {
    throw new Error(`Réponse SMTP inattendue pour ${expectedCode}: ${response}`);
  }
  
  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const requestBody = await req.json();
    console.log('Received test request:', requestBody);
    
    const { type, host, port, username, password, api_key, domain, region, encryption }: SmtpTestRequest = requestBody;

    console.log(`Testing ${type} connection...`);

    if (type === 'smtp') {
      return await testSmtpServerProfessional({ host, port, username, password, encryption });
    } else if (type === 'sendgrid') {
      return await testSendGridConnection(api_key!);
    } else if (type === 'mailgun') {
      return await testMailgunConnection(api_key!, domain!, region);
    } else if (type === 'amazon_ses') {
      return await testAmazonSESConnection(api_key!, password!, region!);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Type de serveur non supporté' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur lors du test:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Erreur interne du serveur'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// FONCTION CORRIGÉE pour OVH/7TIC avec diagnostic réseau
async function testSmtpServerProfessional(params: {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: string;
}) {
  const { host, port, username, password, encryption } = params;
  
  console.log('Testing SMTP connection with:', { host, port, username: username ? '***' : 'missing', encryption });

  if (!host || !port) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Hôte et port SMTP requis pour le test' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const isOvhServer = host.includes('ovh.net');
  const timeout = isOvhServer ? 12000 : 8000;
  
  // DIAGNOSTIC COMPLET AVANT TEST SMTP
  console.log('🔍 DÉBUT DIAGNOSTIC RÉSEAU pour', host);
  const networkDiagnostic = await diagnosticNetwork(host, port);
  console.log('📋 RÉSULTAT DIAGNOSTIC:');
  console.log(networkDiagnostic);

  // Si diagnostic révèle un problème réseau, retourner immédiatement
  if (networkDiagnostic.includes('DNS ÉCHEC') || 
      networkDiagnostic.includes('TCP ÉCHEC') || 
      networkDiagnostic.includes('SSL ÉCHEC')) {
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Problème de connectivité réseau détecté',
      diagnostic: networkDiagnostic,
      recommendation: isOvhServer 
        ? 'Le serveur OVH/7TIC semble inaccessible depuis Supabase. Vérifiez avec votre hébergeur ou testez un autre serveur SMTP.'
        : 'Vérifiez la configuration réseau et les paramètres du serveur.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Si diagnostic OK, continuer avec le test SMTP complet
  console.log('✅ Diagnostic réseau OK, test SMTP en cours...');
  
  // Test de comparaison avec différents serveurs OVH
  const ovhServers = [
    { host: 'ssl0.ovh.net', port: 465 },
    { host: 'ssl0.ovh.net', port: 587 },
    { host: 'pro1.mail.ovh.net', port: 587 },
    { host: 'mail.ovh.net', port: 587 }
  ];

  if (isOvhServer) {
    console.log('🔍 Test de comparaison serveurs OVH:');
    for (const server of ovhServers) {
      const serverTest = await diagnosticNetwork(server.host, server.port);
      console.log(`📋 ${server.host}:${server.port} →`, serverTest.split('\n')[0]);
    }
  }
  
  try {
    let socket: Deno.TlsConn | Deno.Conn;
    
    // CORRECTION SSL/TLS selon le port
    if (port === 465) {
      // Port 465 = SSL direct
      socket = await Deno.connectTls({
        hostname: host,
        port: port,
      });
    } else {
      // Port 587 ou autres = connexion normale puis STARTTLS
      socket = await Deno.connect({
        hostname: host,
        port: port,
      });
    }
    
    // Lire message de bienvenue
    await sendCommand(socket, '', '220', 3000);
    
    // EHLO
    await sendCommand(socket, `EHLO localhost`, '250', timeout);
    
    // STARTTLS seulement si port != 465
    if (port !== 465 && encryption === 'tls') {
      await sendCommand(socket, 'STARTTLS', '220', timeout);
      
      // Upgrade vers TLS
      socket = await Deno.startTls(socket as Deno.Conn, {
        hostname: host,
      });
      
      // Nouvel EHLO après STARTTLS
      await sendCommand(socket, `EHLO localhost`, '250', timeout);
    }
    
    if (username && password) {
      // Test d'authentification
      await sendCommand(socket, 'AUTH LOGIN', '334', timeout);
      
      const usernameB64 = btoa(username);
      await sendCommand(socket, usernameB64, '334', timeout);
      
      const passwordB64 = btoa(password);
      await sendCommand(socket, passwordB64, '235', timeout);
      
      console.log('✅ Authentification réussie');
    }
    
    // QUIT
    await sendCommand(socket, 'QUIT', '221', 2000);
    
    socket.close();

    return new Response(JSON.stringify({ 
      success: true, 
      message: isOvhServer ? 'Connexion OVH/7TIC réussie avec parsing multi-lignes' : 'Connexion SMTP réussie',
      details: {
        server_type: isOvhServer ? 'OVH/7TIC' : 'Standard',
        ssl_method: port === 465 ? 'SSL Direct' : 'STARTTLS',
        authentication: username && password ? 'Testée et validée' : 'Non testée'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur de connexion SMTP:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Test SMTP échoué: ${error.message}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testSendGridConnection(apiKey: string) {
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Clé API SendGrid requise' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Connexion SendGrid réussie',
        details: { account_type: data.type }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erreur SendGrid: ${response.status} ${response.statusText}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur SendGrid: ${error.message}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testMailgunConnection(apiKey: string, domain: string, region?: string) {
  if (!apiKey || !domain) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Clé API et domaine Mailgun requis' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const baseUrl = region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
  
  try {
    const response = await fetch(`${baseUrl}/v3/domains/${domain}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Connexion Mailgun réussie',
        details: { domain_state: data.domain?.state }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erreur Mailgun: ${response.status} ${response.statusText}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur Mailgun: ${error.message}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function testAmazonSESConnection(accessKeyId: string, secretAccessKey: string, region: string) {
  if (!accessKeyId || !secretAccessKey || !region) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Access Key ID, Secret Access Key et région AWS requis' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Test basique pour Amazon SES - vérification des paramètres
    const service = 'ses';
    const host = `${service}.${region}.amazonaws.com`;
    
    // Test de résolution DNS pour vérifier que la région existe
    try {
      const testUrl = `https://${host}`;
      const testResponse = await fetch(testUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Configuration Amazon SES valide - région accessible',
        details: { 
          region: region,
          endpoint: host,
          note: 'Test de connectivité uniquement - signature AWS requise pour validation complète'
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (dnsError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Région AWS invalide ou inaccessible: ${region}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur Amazon SES: ${error.message}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}