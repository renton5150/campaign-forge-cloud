
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
      return await testSmtpConnection({ host, port, username, password, encryption });
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

  } catch (error) {
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

async function testSmtpConnection({ host, port, username, password, encryption }: {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: string;
}) {
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

  try {
    // Test de connexion TCP au serveur SMTP
    console.log(`Attempting to connect to ${host}:${port}`);
    
    const conn = await Deno.connect({
      hostname: host,
      port: port,
      transport: 'tcp'
    });

    console.log('TCP connection established');

    // Lire la réponse de bienvenue du serveur
    const buffer = new Uint8Array(1024);
    const bytesRead = await conn.read(buffer);
    const response = new TextDecoder().decode(buffer.subarray(0, bytesRead || 0));
    
    console.log('SMTP Response:', response);

    // Vérifier que la réponse commence par 220 (Service ready)
    if (!response.startsWith('220')) {
      conn.close();
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Réponse SMTP invalide: ${response.trim()}` 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Envoyer EHLO
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(`EHLO test.domain.com\r\n`));
    
    const helloBuffer = new Uint8Array(1024);
    const helloBytesRead = await conn.read(helloBuffer);
    const helloResponse = new TextDecoder().decode(helloBuffer.subarray(0, helloBytesRead || 0));
    
    console.log('EHLO Response:', helloResponse);

    // Fermer la connexion proprement
    await conn.write(encoder.encode(`QUIT\r\n`));
    conn.close();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Connexion SMTP réussie - Serveur accessible',
      details: {
        server_response: response.trim(),
        ehlo_response: helloResponse.trim(),
        note: username && password ? 'Credentials fournis mais non testés pour sécurité' : 'Test de connectivité uniquement'
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur de connexion SMTP:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Impossible de se connecter au serveur SMTP: ${error.message}` 
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
  } catch (error) {
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
  } catch (error) {
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

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur Amazon SES: ${error.message}` 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
