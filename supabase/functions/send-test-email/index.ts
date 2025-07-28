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

// Fonction pour analyser les réponses SMTP
function analyzeSMTPResponse(response: string, command: string): { success: boolean; code: string; message: string; analysis: string } {
  const lines = response.trim().split('\n');
  const firstLine = lines[0] || '';
  const code = firstLine.substring(0, 3);
  const message = firstLine.substring(4);
  
  let analysis = '';
  let success = false;
  
  switch (command) {
    case 'CONNECT':
      success = code === '220';
      analysis = success ? 'Connexion serveur acceptée' : `Serveur refuse la connexion: ${message}`;
      break;
    case 'EHLO':
      success = code === '250';
      analysis = success ? 'Serveur reconnu et capacités reçues' : `Erreur EHLO: ${message}`;
      break;
    case 'STARTTLS':
      success = code === '220';
      analysis = success ? 'TLS prêt à démarrer' : `Erreur TLS: ${message}`;
      break;
    case 'AUTH':
      success = code === '334';
      analysis = success ? 'Authentification initiée' : `Erreur auth: ${message}`;
      break;
    case 'AUTH_USER':
      success = code === '334';
      analysis = success ? 'Nom d\'utilisateur accepté' : `Erreur user: ${message}`;
      break;
    case 'AUTH_PASS':
      success = code === '235';
      analysis = success ? 'Authentification réussie' : `Erreur mot de passe: ${message}`;
      break;
    case 'MAIL_FROM':
      success = code === '250';
      analysis = success ? 'Expéditeur accepté' : `Erreur expéditeur: ${message}`;
      break;
    case 'RCPT_TO':
      success = code === '250';
      analysis = success ? 'Destinataire accepté' : `Erreur destinataire: ${message}`;
      break;
    case 'DATA':
      success = code === '354';
      if (code === '566') {
        analysis = `LIMITE SMTP ATTEINTE: ${message}. Cela peut indiquer: 1) Limite quotidienne/horaire dépassée, 2) Politique anti-spam activée, 3) Restriction IP, 4) Configuration serveur restrictive`;
      } else {
        analysis = success ? 'Serveur prêt à recevoir le contenu' : `Erreur DATA: ${message}`;
      }
      break;
    case 'CONTENT':
      success = code === '250';
      analysis = success ? 'Email envoyé avec succès' : `Erreur envoi: ${message}`;
      break;
    default:
      success = code.startsWith('2') || code.startsWith('3');
      analysis = `Réponse ${command}: ${message}`;
  }
  
  return { success, code, message, analysis };
}

// Fonction pour tester la connexion SMTP sans envoi
async function testSMTPConnection(smtpConfig: any): Promise<{ success: boolean; steps: any[]; error?: string }> {
  const { host, port, username, password, encryption } = smtpConfig;
  const steps: any[] = [];
  
  console.log('🔍 TEST DE CONNEXION SMTP DÉTAILLÉ');
  console.log(`📡 Serveur: ${host}:${port} (${encryption || 'non-chiffré'})`);
  
  let conn;
  try {
    // Étape 1: Connexion TCP
    console.log('🔌 Étape 1: Connexion TCP...');
    conn = await Deno.connect({
      hostname: host,
      port: port || 587,
      transport: 'tcp'
    });
    
    steps.push({ step: 'TCP_CONNECT', success: true, message: 'Connexion TCP établie' });
    
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function sendCommand(command: string, commandType: string): Promise<string> {
      console.log(`📤 ${commandType}: ${command.trim()}`);
      await conn.write(encoder.encode(command));
      
      const buffer = new Uint8Array(4096);
      const bytesRead = await conn.read(buffer);
      const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
      
      const analysis = analyzeSMTPResponse(response, commandType);
      console.log(`📥 ${commandType} (${analysis.code}): ${analysis.message}`);
      console.log(`🔍 Analyse: ${analysis.analysis}`);
      
      steps.push({
        step: commandType,
        success: analysis.success,
        code: analysis.code,
        message: analysis.message,
        analysis: analysis.analysis,
        raw_response: response.trim()
      });
      
      return response;
    }

    // Étape 2: Réponse de bienvenue
    console.log('👋 Étape 2: Lecture de la réponse de bienvenue...');
    const welcomeBuffer = new Uint8Array(1024);
    const welcomeBytesRead = await conn.read(welcomeBuffer);
    const welcomeResponse = decoder.decode(welcomeBuffer.subarray(0, welcomeBytesRead || 0));
    
    const welcomeAnalysis = analyzeSMTPResponse(welcomeResponse, 'CONNECT');
    console.log(`📥 BIENVENUE (${welcomeAnalysis.code}): ${welcomeAnalysis.message}`);
    console.log(`🔍 Analyse: ${welcomeAnalysis.analysis}`);
    
    steps.push({
      step: 'WELCOME',
      success: welcomeAnalysis.success,
      code: welcomeAnalysis.code,
      message: welcomeAnalysis.message,
      analysis: welcomeAnalysis.analysis
    });
    
    if (!welcomeAnalysis.success) {
      throw new Error(`Erreur de bienvenue: ${welcomeAnalysis.message}`);
    }

    // Étape 3: EHLO
    console.log('🤝 Étape 3: Négociation EHLO...');
    const ehloResponse = await sendCommand(`EHLO ${host}\r\n`, 'EHLO');
    
    // Étape 4: STARTTLS si nécessaire
    if (encryption === 'tls') {
      console.log('🔒 Étape 4: Démarrage TLS...');
      const startTlsResponse = await sendCommand('STARTTLS\r\n', 'STARTTLS');
      
      if (startTlsResponse.startsWith('220')) {
        conn = await Deno.startTls(conn, { hostname: host });
        console.log('🔐 TLS activé avec succès');
        
        // Re-EHLO après TLS
        const ehloTlsResponse = await sendCommand(`EHLO ${host}\r\n`, 'EHLO_TLS');
      }
    }

    // Étape 5: Authentification
    if (username && password) {
      console.log('🔑 Étape 5: Test d\'authentification...');
      
      const authResponse = await sendCommand('AUTH LOGIN\r\n', 'AUTH');
      if (authResponse.startsWith('334')) {
        const userResponse = await sendCommand(`${encodeBase64(username)}\r\n`, 'AUTH_USER');
        if (userResponse.startsWith('334')) {
          const passResponse = await sendCommand(`${encodeBase64(password)}\r\n`, 'AUTH_PASS');
        }
      }
    }

    // Étape 6: Test MAIL FROM
    console.log('📧 Étape 6: Test MAIL FROM...');
    await sendCommand(`MAIL FROM:<test@example.com>\r\n`, 'MAIL_FROM');

    // Étape 7: Fermeture propre
    console.log('👋 Étape 7: Fermeture de la connexion...');
    await sendCommand('QUIT\r\n', 'QUIT');
    
    return { success: true, steps };
    
  } catch (error) {
    console.error('❌ Erreur lors du test de connexion:', error);
    steps.push({
      step: 'ERROR',
      success: false,
      error: error.message,
      analysis: `Erreur critique: ${error.message}`
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

// Fonction d'envoi SMTP améliorée
async function sendSMTPEmail(smtpConfig: any, emailData: any) {
  const { host, port, username, password, encryption } = smtpConfig;
  
  console.log('📧 ENVOI EMAIL SMTP AVEC DIAGNOSTIC AVANCÉ');
  console.log(`📡 Serveur: ${host}:${port}`);
  console.log(`📨 De: ${emailData.from_email} vers: ${emailData.to}`);
  
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
    throw new Error(`Connexion TCP échouée: ${error.message}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function sendCommand(command: string, commandType: string): Promise<string> {
    console.log(`📤 ${commandType}: ${command.trim()}`);
    await conn.write(encoder.encode(command));
    
    const buffer = new Uint8Array(4096);
    const bytesRead = await conn.read(buffer);
    const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
    
    const analysis = analyzeSMTPResponse(response, commandType);
    console.log(`📥 ${commandType} (${analysis.code}): ${analysis.message}`);
    console.log(`🔍 ${analysis.analysis}`);
    
    if (!analysis.success) {
      throw new Error(`${commandType} échoué: ${analysis.message}`);
    }
    
    return response;
  }

  try {
    // 1. Lire la réponse de bienvenue
    const welcomeBuffer = new Uint8Array(1024);
    const welcomeBytesRead = await conn.read(welcomeBuffer);
    const welcomeResponse = decoder.decode(welcomeBuffer.subarray(0, welcomeBytesRead || 0));
    console.log('👋 Bienvenue:', welcomeResponse.trim());
    
    if (!welcomeResponse.startsWith('220')) {
      throw new Error(welcomeResponse.trim());
    }

    // 2. Envoyer EHLO
    const ehloResponse = await sendCommand(`EHLO ${host}\r\n`, 'EHLO');
    if (!ehloResponse.startsWith('250')) {
      throw new Error(ehloResponse.trim());
    }

    // 3. Démarrer TLS si nécessaire
    if (encryption === 'tls') {
      const startTlsResponse = await sendCommand('STARTTLS\r\n', 'STARTTLS');
      if (!startTlsResponse.startsWith('220')) {
        throw new Error(startTlsResponse.trim());
      }
      
      // Upgrade vers TLS
      conn = await Deno.startTls(conn, { hostname: host });
      console.log('🔒 Connexion TLS établie');
      
      // Renvoyer EHLO après TLS
      const ehloTlsResponse = await sendCommand(`EHLO ${host}\r\n`, 'EHLO_TLS');
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(ehloTlsResponse.trim());
      }
    }

    // 4. Authentification
    if (username && password) {
      const authResponse = await sendCommand('AUTH LOGIN\r\n', 'AUTH');
      if (!authResponse.startsWith('334')) {
        throw new Error(authResponse.trim());
      }

      // Envoyer le nom d'utilisateur
      const userResponse = await sendCommand(`${encodeBase64(username)}\r\n`, 'AUTH_USER');
      if (!userResponse.startsWith('334')) {
        throw new Error(userResponse.trim());
      }

      // Envoyer le mot de passe
      const passResponse = await sendCommand(`${encodeBase64(password)}\r\n`, 'AUTH_PASS');
      if (!passResponse.startsWith('235')) {
        throw new Error(passResponse.trim());
      }
      
      console.log('🔐 Authentification réussie');
    }

    // 5. Envoyer MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${emailData.from_email}>\r\n`, 'MAIL_FROM');
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(mailFromResponse.trim());
    }

    // 6. Envoyer RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${emailData.to}>\r\n`, 'RCPT_TO');
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(rcptToResponse.trim());
    }
    
    // Étape critique: DATA
    console.log('📝 Étape critique: Envoi de la commande DATA...');
    const dataResponse = await sendCommand('DATA\r\n', 'DATA');

    // Envoi du contenu
    console.log('📄 Envoi du contenu de l\'email...');
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

    const contentResponse = await sendCommand(emailContent, 'CONTENT');
    
    await sendCommand('QUIT\r\n', 'QUIT');
    
    console.log('✅ Email envoyé avec succès');
    
    return {
      messageId: `smtp-${Date.now()}@${host}`,
      accepted: [emailData.to],
      rejected: [],
      response: '250 OK - Message accepté'
    };

  } catch (error) {
    console.error('❌ Erreur SMTP détaillée:', error);
    throw error;
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
    console.log('🚀 DÉBUT DU TEST EMAIL AVEC DIAGNOSTIC AVANCÉ');
    
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
    console.log('🔧 Configuration:', {
      host: smtpServer.host,
      port: smtpServer.port,
      username: smtpServer.username ? '***' : 'non défini',
      encryption: smtpServer.encryption
    });

    // Étape 1: Test de connexion
    console.log('🔍 ÉTAPE 1: Test de connexion SMTP...');
    const connectionTest = await testSMTPConnection(smtpServer);
    
    if (!connectionTest.success) {
      console.error('❌ Test de connexion échoué');
      return new Response(JSON.stringify({
        success: false,
        error: 'Test de connexion SMTP échoué',
        details: connectionTest.error,
        diagnostic: {
          server: smtpServer.name,
          steps: connectionTest.steps
        }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log('✅ Test de connexion réussi');

    // Étape 2: Envoi de l'email
    console.log('🔍 ÉTAPE 2: Envoi de l\'email...');
    const emailData = {
      from: `${from_name} <${from_email}>`,
      from_email: from_email,
      to: to,
      subject: `[TEST] ${subject}`,
      html: html_content,
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
    
    // Analyse de l'erreur
    let errorAnalysis = 'Erreur inconnue';
    if (error.message.includes('566')) {
      errorAnalysis = `ERREUR 566 SMTP LIMIT: Cette erreur provient du serveur SMTP lui-même. Causes possibles:
      1. Limite quotidienne/horaire atteinte sur le serveur
      2. Politique anti-spam activée
      3. Restriction IP ou géolocalisation
      4. Configuration serveur restrictive
      5. Problème de réputation du domaine expéditeur`;
    } else if (error.message.includes('authentication')) {
      errorAnalysis = 'Erreur d\'authentification SMTP - Vérifiez vos identifiants';
    } else if (error.message.includes('connection')) {
      errorAnalysis = 'Erreur de connexion - Vérifiez host/port/firewall';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      analysis: errorAnalysis,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
