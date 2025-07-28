
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface TestEmailRequest {
  to: string;
  subject: string;
  html_content: string;
  from_name: string;
  from_email: string;
}

// Fonction pour encoder en base64
function encodeBase64(str: string): string {
  return btoa(str);
}

// Fonction pour générer un Message-ID unique
function generateMessageId(domain: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `<${timestamp}.${random}@${domain}>`;
}

// Fonction pour formater une date au format RFC 2822
function formatDate(date: Date): string {
  return date.toUTCString().replace(/GMT/, '+0000');
}

// Fonction d'envoi SMTP corrigée
async function sendSMTPEmail(smtpConfig: any, emailData: any) {
  const { host, port, username, password, encryption } = smtpConfig;
  
  console.log('📧 ENVOI EMAIL SMTP CORRIGÉ');
  console.log(`📡 Serveur: ${host}:${port}`);
  console.log(`📨 De: ${emailData.from_email} vers: ${emailData.to}`);
  
  let conn;
  try {
    // Connexion TCP
    conn = await Deno.connect({
      hostname: host,
      port: port || 587,
      transport: 'tcp'
    });
    console.log('✅ Connexion TCP établie');
  } catch (error) {
    console.error('❌ Erreur de connexion TCP:', error);
    throw new Error(`Connexion TCP échouée: ${error.message}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Fonction pour lire la réponse avec timeout
  async function readResponse(timeout = 10000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const buffer = new Uint8Array(4096);
      const bytesRead = await conn.read(buffer);
      clearTimeout(timeoutId);
      
      if (bytesRead === null) {
        throw new Error('Connexion fermée par le serveur');
      }
      
      return decoder.decode(buffer.subarray(0, bytesRead));
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Fonction pour envoyer une commande et lire la réponse
  async function sendCommandAndRead(command: string, expectedCode: string): Promise<string> {
    console.log(`📤 ${command.trim()}`);
    await conn.write(encoder.encode(command));
    
    const response = await readResponse();
    console.log(`📥 ${response.trim()}`);
    
    if (!response.startsWith(expectedCode)) {
      throw new Error(`Commande échouée: ${response.trim()}`);
    }
    
    return response;
  }

  try {
    // 1. Lire la réponse de bienvenue
    const welcome = await readResponse();
    console.log('👋 Bienvenue:', welcome.trim());
    
    if (!welcome.startsWith('220')) {
      throw new Error(`Connexion refusée: ${welcome.trim()}`);
    }

    // 2. EHLO
    await sendCommandAndRead(`EHLO ${host}\r\n`, '250');

    // 3. STARTTLS si nécessaire
    if (encryption === 'tls') {
      await sendCommandAndRead('STARTTLS\r\n', '220');
      
      // Upgrade vers TLS
      conn = await Deno.startTls(conn, { hostname: host });
      console.log('🔒 TLS activé');
      
      // Re-EHLO après TLS
      await sendCommandAndRead(`EHLO ${host}\r\n`, '250');
    }

    // 4. Authentification
    if (username && password) {
      await sendCommandAndRead('AUTH LOGIN\r\n', '334');
      await sendCommandAndRead(`${encodeBase64(username)}\r\n`, '334');
      await sendCommandAndRead(`${encodeBase64(password)}\r\n`, '235');
      console.log('🔐 Authentification réussie');
    }

    // 5. MAIL FROM
    await sendCommandAndRead(`MAIL FROM:<${emailData.from_email}>\r\n`, '250');

    // 6. RCPT TO
    await sendCommandAndRead(`RCPT TO:<${emailData.to}>\r\n`, '250');

    // 7. DATA
    await sendCommandAndRead('DATA\r\n', '354');

    // 8. Construire le message avec headers standards
    const domain = emailData.from_email.split('@')[1];
    const messageId = generateMessageId(domain);
    const date = formatDate(new Date());
    
    const message = [
      `Message-ID: ${messageId}`,
      `Date: ${date}`,
      `From: ${emailData.from_name} <${emailData.from_email}>`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      emailData.html_content,
      '',
      '.'
    ].join('\r\n');

    console.log('📄 Envoi du message...');
    await conn.write(encoder.encode(message + '\r\n'));

    // Lire la réponse finale
    const finalResponse = await readResponse();
    console.log('📥 Réponse finale:', finalResponse.trim());

    if (!finalResponse.startsWith('250')) {
      throw new Error(`Envoi échoué: ${finalResponse.trim()}`);
    }

    // 9. QUIT
    await sendCommandAndRead('QUIT\r\n', '221');
    
    console.log('✅ Email envoyé avec succès');
    
    return {
      messageId: messageId,
      accepted: [emailData.to],
      rejected: [],
      response: finalResponse.trim()
    };

  } catch (error) {
    console.error('❌ Erreur SMTP:', error);
    throw error;
  } finally {
    try {
      if (conn) conn.close();
    } catch (e) {
      console.log('Connexion déjà fermée');
    }
  }
}

// Fonction de test de connexion simplifiée
async function testSMTPConnection(smtpConfig: any): Promise<{ success: boolean; steps: any[]; error?: string }> {
  const { host, port, username, password, encryption } = smtpConfig;
  const steps: any[] = [];
  
  console.log('🔍 TEST DE CONNEXION SMTP');
  console.log(`📡 Serveur: ${host}:${port} (${encryption || 'non-chiffré'})`);
  
  let conn;
  try {
    // Test de connexion TCP
    conn = await Deno.connect({
      hostname: host,
      port: port || 587,
      transport: 'tcp'
    });
    
    steps.push({ step: 'TCP_CONNECT', success: true, message: 'Connexion TCP établie' });
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Lire bienvenue
    const buffer = new Uint8Array(1024);
    const bytesRead = await conn.read(buffer);
    const welcome = decoder.decode(buffer.subarray(0, bytesRead || 0));
    
    if (welcome.startsWith('220')) {
      steps.push({ step: 'WELCOME', success: true, message: 'Serveur prêt' });
    } else {
      steps.push({ step: 'WELCOME', success: false, message: welcome.trim() });
      return { success: false, steps };
    }

    // Test EHLO
    await conn.write(encoder.encode(`EHLO ${host}\r\n`));
    const ehloBuffer = new Uint8Array(1024);
    const ehloBytesRead = await conn.read(ehloBuffer);
    const ehloResponse = decoder.decode(ehloBuffer.subarray(0, ehloBytesRead || 0));
    
    if (ehloResponse.startsWith('250')) {
      steps.push({ step: 'EHLO', success: true, message: 'EHLO accepté' });
    } else {
      steps.push({ step: 'EHLO', success: false, message: ehloResponse.trim() });
      return { success: false, steps };
    }

    // Test TLS si nécessaire
    if (encryption === 'tls') {
      await conn.write(encoder.encode('STARTTLS\r\n'));
      const tlsBuffer = new Uint8Array(1024);
      const tlsBytesRead = await conn.read(tlsBuffer);
      const tlsResponse = decoder.decode(tlsBuffer.subarray(0, tlsBytesRead || 0));
      
      if (tlsResponse.startsWith('220')) {
        steps.push({ step: 'STARTTLS', success: true, message: 'TLS disponible' });
        try {
          conn = await Deno.startTls(conn, { hostname: host });
          steps.push({ step: 'TLS_HANDSHAKE', success: true, message: 'TLS activé' });
        } catch (tlsError) {
          steps.push({ step: 'TLS_HANDSHAKE', success: false, message: tlsError.message });
          return { success: false, steps };
        }
      } else {
        steps.push({ step: 'STARTTLS', success: false, message: tlsResponse.trim() });
        return { success: false, steps };
      }
    }

    // Test authentification
    if (username && password) {
      await conn.write(encoder.encode('AUTH LOGIN\r\n'));
      const authBuffer = new Uint8Array(1024);
      const authBytesRead = await conn.read(authBuffer);
      const authResponse = decoder.decode(authBuffer.subarray(0, authBytesRead || 0));
      
      if (authResponse.startsWith('334')) {
        steps.push({ step: 'AUTH', success: true, message: 'Authentification disponible' });
      } else {
        steps.push({ step: 'AUTH', success: false, message: authResponse.trim() });
        return { success: false, steps };
      }
    }

    // Fermeture propre
    await conn.write(encoder.encode('QUIT\r\n'));
    
    return { success: true, steps };
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    steps.push({
      step: 'ERROR',
      success: false,
      error: error.message,
      message: `Erreur: ${error.message}`
    });
    return { success: false, steps, error: error.message };
  } finally {
    try {
      if (conn) conn.close();
    } catch (e) {
      console.log('Connexion déjà fermée');
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 DÉBUT DU TEST EMAIL CORRIGÉ');
    
    const body = await req.text();
    console.log('📝 Body reçu:', body);
    
    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Format JSON invalide',
        details: parseError.message
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, subject, html_content, from_name, from_email }: TestEmailRequest = requestData;

    console.log('📧 Test email vers:', to);
    console.log('📧 Sujet:', subject);
    console.log('📧 From:', from_email);

    // Validation des paramètres
    if (!to || !subject || !html_content || !from_name || !from_email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Paramètres manquants',
        required: ['to', 'subject', 'html_content', 'from_name', 'from_email']
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Récupérer le serveur SMTP
    const { data: smtpServer, error: smtpError } = await supabase
      .from('smtp_servers')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (smtpError || !smtpServer) {
      console.error('❌ Aucun serveur SMTP configuré:', smtpError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Aucun serveur SMTP configuré',
        details: smtpError?.message || 'Aucun serveur actif trouvé'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('🔧 Serveur SMTP trouvé:', smtpServer.name);

    // Test de connexion
    console.log('🔍 Test de connexion...');
    const connectionTest = await testSMTPConnection(smtpServer);
    
    if (!connectionTest.success) {
      console.error('❌ Test de connexion échoué');
      return new Response(JSON.stringify({
        success: false,
        error: 'Test de connexion SMTP échoué',
        details: connectionTest.error,
        diagnostic: {
          server: smtpServer.name,
          connection_test: connectionTest.steps,
          server_config: {
            host: smtpServer.host,
            port: smtpServer.port,
            encryption: smtpServer.encryption
          }
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('✅ Test de connexion réussi');

    // Envoi de l'email
    const emailData = {
      from: `${from_name} <${from_email}>`,
      from_email: from_email,
      to: to,
      subject: `[TEST] ${subject}`,
      html_content: html_content,
    };

    const result = await sendSMTPEmail(smtpServer, emailData);
    
    console.log('✅ Email envoyé avec succès:', result.messageId);

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      message: 'Email de test envoyé avec succès',
      details: {
        to: to,
        subject: emailData.subject,
        server: smtpServer.name
      },
      diagnostic: {
        connection_test: connectionTest.steps,
        server_config: {
          host: smtpServer.host,
          port: smtpServer.port,
          encryption: smtpServer.encryption
        }
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erreur lors du test email:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
