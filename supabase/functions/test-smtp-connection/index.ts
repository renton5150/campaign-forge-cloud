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

// FONCTION CORRIGÉE pour OVH/7TIC
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