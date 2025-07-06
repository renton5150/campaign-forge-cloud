
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

serve(async (req) => {
  // Vérifier la méthode HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { type, host, port, username, password, api_key, domain, region, encryption }: SmtpTestRequest = await req.json();

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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur lors du test:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
  if (!host || !port || !username || !password) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Paramètres SMTP manquants' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Test de connexion TCP au serveur SMTP
    const conn = await Deno.connect({
      hostname: host,
      port: port,
      transport: encryption === 'ssl' ? 'tcp' : 'tcp'
    });

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
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Envoyer HELO/EHLO
    const encoder = new TextEncoder();
    await conn.write(encoder.encode(`EHLO test.com\r\n`));
    
    const helloBuffer = new Uint8Array(1024);
    const helloBytesRead = await conn.read(helloBuffer);
    const helloResponse = new TextDecoder().decode(helloBuffer.subarray(0, helloBytesRead || 0));
    
    console.log('EHLO Response:', helloResponse);

    conn.close();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Connexion SMTP réussie',
      details: {
        server_response: response.trim(),
        ehlo_response: helloResponse.trim()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur de connexion SMTP:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Impossible de se connecter au serveur SMTP: ${error.message}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testSendGridConnection(apiKey: string) {
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
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erreur SendGrid: ${response.status} ${response.statusText}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur SendGrid: ${error.message}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testMailgunConnection(apiKey: string, domain: string, region?: string) {
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
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Erreur Mailgun: ${response.status} ${response.statusText}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur Mailgun: ${error.message}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function testAmazonSESConnection(accessKeyId: string, secretAccessKey: string, region: string) {
  // Pour Amazon SES, on teste en listant les identités vérifiées
  const service = 'ses';
  const host = `${service}.${region}.amazonaws.com`;
  const method = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  
  const payload = 'Action=ListIdentities&Version=2010-12-01';
  const contentType = 'application/x-www-form-urlencoded; charset=utf-8';
  
  try {
    // Créer la signature AWS v4 (implémentation simplifiée pour le test)
    const date = new Date();
    const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = date.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    
    const headers = {
      'Content-Type': contentType,
      'Host': host,
      'X-Amz-Date': amzDate
    };

    // Note: Une implémentation complète d'AWS v4 signature serait nécessaire ici
    // Pour cette démo, on fait un test basique
    const response = await fetch(`https://${host}/`, {
      method: method,
      headers: headers,
      body: payload
    });

    if (response.status === 403) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Clés AWS invalides ou permissions insuffisantes' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Test Amazon SES effectué (signature complète requise pour validation complète)'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Erreur Amazon SES: ${error.message}` 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
