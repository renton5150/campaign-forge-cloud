
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

// Fonction pour encoder en base64 (pour l'authentification SMTP)
function encodeBase64(str: string): string {
  return btoa(str);
}

// Fonction pour envoyer un email via SMTP en utilisant l'API native de Deno
async function sendSMTPEmail(smtpConfig: any, emailData: any) {
  const { host, port, username, password, encryption } = smtpConfig;
  
  console.log('🔗 Connexion au serveur SMTP:', host, port);
  
  // Établir la connexion TCP
  let conn;
  try {
    conn = await Deno.connect({
      hostname: host,
      port: port || 587,
      transport: 'tcp'
    });
    console.log('✅ Connexion TCP établie');
  } catch (error) {
    console.error('❌ Erreur de connexion TCP:', error);
    throw new Error(`Impossible de se connecter au serveur SMTP: ${error.message}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Fonction pour envoyer une commande et lire la réponse
  async function sendCommand(command: string): Promise<string> {
    console.log('📤 Envoi:', command.trim());
    await conn.write(encoder.encode(command));
    
    const buffer = new Uint8Array(4096);
    const bytesRead = await conn.read(buffer);
    const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
    console.log('📥 Réponse:', response.trim());
    
    return response;
  }

  try {
    // 1. Lire la réponse de bienvenue
    const welcomeBuffer = new Uint8Array(1024);
    const welcomeBytesRead = await conn.read(welcomeBuffer);
    const welcomeResponse = decoder.decode(welcomeBuffer.subarray(0, welcomeBytesRead || 0));
    console.log('👋 Bienvenue:', welcomeResponse.trim());
    
    if (!welcomeResponse.startsWith('220')) {
      throw new Error(`Erreur de connexion SMTP: ${welcomeResponse.trim()}`);
    }

    // 2. Envoyer EHLO
    const ehloResponse = await sendCommand(`EHLO ${host}\r\n`);
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehloResponse.trim()}`);
    }

    // 3. Démarrer TLS si nécessaire
    if (encryption === 'tls') {
      const startTlsResponse = await sendCommand('STARTTLS\r\n');
      if (!startTlsResponse.startsWith('220')) {
        throw new Error(`Erreur STARTTLS: ${startTlsResponse.trim()}`);
      }
      
      // Upgrade vers TLS
      conn = await Deno.startTls(conn, { hostname: host });
      console.log('🔒 Connexion TLS établie');
      
      // Renvoyer EHLO après TLS
      const ehloTlsResponse = await sendCommand(`EHLO ${host}\r\n`);
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(`Erreur EHLO après TLS: ${ehloTlsResponse.trim()}`);
      }
    }

    // 4. Authentification
    if (username && password) {
      const authResponse = await sendCommand('AUTH LOGIN\r\n');
      if (!authResponse.startsWith('334')) {
        throw new Error(`Erreur AUTH LOGIN: ${authResponse.trim()}`);
      }

      // Envoyer le nom d'utilisateur
      const userResponse = await sendCommand(`${encodeBase64(username)}\r\n`);
      if (!userResponse.startsWith('334')) {
        throw new Error(`Erreur authentification utilisateur: ${userResponse.trim()}`);
      }

      // Envoyer le mot de passe
      const passResponse = await sendCommand(`${encodeBase64(password)}\r\n`);
      if (!passResponse.startsWith('235')) {
        throw new Error(`Erreur authentification mot de passe: ${passResponse.trim()}`);
      }
      
      console.log('🔐 Authentification réussie');
    }

    // 5. Envoyer MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${emailData.from_email}>\r\n`);
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`Erreur MAIL FROM: ${mailFromResponse.trim()}`);
    }

    // 6. Envoyer RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${emailData.to}>\r\n`);
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(`Erreur RCPT TO: ${rcptToResponse.trim()}`);
    }

    // 7. Envoyer DATA
    const dataResponse = await sendCommand('DATA\r\n');
    if (!dataResponse.startsWith('354')) {
      // Gestion spécifique des erreurs SMTP
      if (dataResponse.includes('566') || dataResponse.includes('limit exceeded')) {
        throw new Error('SMTP_LIMIT_EXCEEDED');
      }
      throw new Error(`Erreur DATA: ${dataResponse.trim()}`);
    }

    // 8. Envoyer le contenu de l'email
    const emailContent = [
      `From: ${emailData.from}`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      emailData.html,
      '.',
      ''
    ].join('\r\n');

    const contentResponse = await sendCommand(emailContent);
    if (!contentResponse.startsWith('250')) {
      throw new Error(`Erreur envoi contenu: ${contentResponse.trim()}`);
    }

    // 9. Envoyer QUIT
    await sendCommand('QUIT\r\n');
    
    console.log('📧 Email envoyé avec succès via SMTP');
    
    return {
      messageId: `smtp-${Date.now()}@${host}`,
      accepted: [emailData.to],
      rejected: [],
      response: '250 OK - Message accepted'
    };

  } catch (error) {
    console.error('❌ Erreur SMTP:', error);
    throw error;
  } finally {
    try {
      conn.close();
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
    console.log('🚀 Début de l\'envoi d\'email de test');
    
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

    console.log('📧 Envoi d\'email de test vers:', to);
    console.log('📧 Sujet:', subject);
    console.log('📧 From:', from_email);

    // Validation des paramètres
    if (!to || !subject || !html_content || !from_name || !from_email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Paramètres manquants. Tous les champs sont requis.',
        required: ['to', 'subject', 'html_content', 'from_name', 'from_email']
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Récupérer le premier serveur SMTP actif
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
        error: 'Aucun serveur SMTP configuré. Veuillez configurer un serveur SMTP actif.',
        details: smtpError?.message || 'Aucun serveur actif trouvé'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('🔧 Serveur SMTP trouvé:', smtpServer.name);

    // Préparation des données email
    const emailData = {
      from: `${from_name} <${from_email}>`,
      from_email: from_email,
      to: to,
      subject: `[TEST] ${subject}`,
      html: html_content,
    };

    console.log('📤 Envoi en cours via SMTP...');
    
    // Utiliser la fonction SMTP native
    const result = await sendSMTPEmail(smtpServer, emailData);
    
    console.log('✅ Email de test envoyé avec succès:', result.messageId);

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      message: 'Email de test envoyé avec succès via SMTP',
      details: {
        to: to,
        subject: emailData.subject,
        server: smtpServer.name
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du test:', error);
    
    // IMPORTANT: Toujours retourner une réponse HTTP valide, même en cas d'erreur
    let errorMessage = 'Erreur lors de l\'envoi du test';
    let statusCode = 500;
    let errorDetails = error.message || 'Erreur inconnue';

    // Gestion spécifique des erreurs SMTP avec codes de statut appropriés
    if (error.message === 'SMTP_LIMIT_EXCEEDED' || error.message?.includes('566') || error.message?.includes('limit exceeded')) {
      errorMessage = 'Limite SMTP atteinte';
      errorDetails = 'Votre serveur SMTP a atteint sa limite d\'envoi quotidienne ou horaire. Veuillez attendre ou contacter votre fournisseur SMTP.';
      statusCode = 429; // Too Many Requests
    } else if (error.message?.includes('authentification') || error.message?.includes('535')) {
      errorMessage = 'Erreur d\'authentification SMTP';
      errorDetails = 'Vérifiez vos identifiants SMTP dans la configuration du serveur.';
      statusCode = 401; // Unauthorized
    } else if (error.message?.includes('550')) {
      errorMessage = 'Adresse email refusée';
      errorDetails = 'L\'adresse email de destination a été refusée par le serveur SMTP.';
      statusCode = 400; // Bad Request
    } else if (error.message?.includes('Impossible de se connecter') || error.message?.includes('ECONNECTION')) {
      errorMessage = 'Erreur de connexion SMTP';
      errorDetails = 'Impossible de se connecter au serveur SMTP. Vérifiez la configuration du serveur.';
      statusCode = 503; // Service Unavailable
    }

    // CRUCIAL: Retourner une réponse HTTP valide avec les en-têtes CORS
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      details: errorDetails,
      code: error.code || 'SMTP_ERROR'
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
