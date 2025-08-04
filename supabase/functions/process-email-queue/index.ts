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

interface QueueItem {
  id: string;
  campaign_id: string;
  contact_email: string;
  contact_name: string | null;
  subject: string;
  html_content: string;
  message_id: string;
  retry_count: number;
}

interface EmailQueueItemWithTenant extends QueueItem {
  tenant_id: string;
}

interface SmtpServer {
  id: string;
  type: string;
  host: string | null;
  port: number | null;
  username: string | null;
  password: string | null;
  api_key: string | null;
  domain: string | null;
  encryption: string | null;
  from_name: string;
  from_email: string;
  tenant_id: string;
  daily_limit?: number;
  hourly_limit?: number;
}

interface SmtpStats {
  serverId: string;
  dailySent: number;
  hourlySent: number;
  lastSent: Date;
  consecutiveFailures: number;
  isHealthy: boolean;
}

// Cache des statistiques SMTP en mémoire - SYSTÈME PROFESSIONNEL
const smtpStatsCache = new Map<string, SmtpStats>();

// Fonction pour encoder en base64
function encodeBase64(str: string): string {
  return btoa(str);
}

// Fonction pour logger les emails - SYSTÈME PROFESSIONNEL
async function logEmailStatus(queueId: string, status: string, message: string, serverId?: string) {
  try {
    await supabase.from('email_logs').insert({
      email_queue_id: queueId,
      status,
      message: `[PROFESSIONAL-${serverId || 'unknown'}] ${message}`,
    });
  } catch (error) {
    console.error('❌ Erreur lors du logging professionnel:', error);
  }
}

// SYSTÈME PROFESSIONNEL - Vérification des limites SMTP avec rate limiting intelligent
async function checkSmtpLimits(server: SmtpServer): Promise<boolean> {
  const stats = smtpStatsCache.get(server.id);
  if (!stats) return true;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Réinitialiser les compteurs si nécessaire - système intelligent
  if (stats.lastSent < hourAgo) {
    stats.hourlySent = 0;
  }
  if (stats.lastSent < dayAgo) {
    stats.dailySent = 0;
  }

  // Vérifier les limites avec marge de sécurité
  const hourlyLimit = server.hourly_limit || 1000;
  const dailyLimit = server.daily_limit || 10000;

  return stats.hourlySent < (hourlyLimit * 0.9) && stats.dailySent < (dailyLimit * 0.9);
}

// SYSTÈME PROFESSIONNEL - Marquer un envoi avec statistiques avancées
function markEmailSent(serverId: string, success: boolean) {
  let stats = smtpStatsCache.get(serverId);
  if (!stats) {
    stats = {
      serverId,
      dailySent: 0,
      hourlySent: 0,
      lastSent: new Date(),
      consecutiveFailures: 0,
      isHealthy: true
    };
    smtpStatsCache.set(serverId, stats);
  }

  if (success) {
    stats.dailySent++;
    stats.hourlySent++;
    stats.consecutiveFailures = 0;
    stats.isHealthy = true;
  } else {
    stats.consecutiveFailures++;
    stats.isHealthy = stats.consecutiveFailures < 3; // Plus strict pour le système professionnel
  }

  stats.lastSent = new Date();
}

// SYSTÈME PROFESSIONNEL - Envoi via API modernes (Mailgun, SendGrid) et SMTP
async function sendEmailProfessional(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  console.log(`📧 [PROFESSIONAL] Envoi via ${server.type} pour ${queueItem.contact_email}`);

  try {
    if (server.type === 'mailgun') {
      return await sendViaMailgun(queueItem, server);
    } else if (server.type === 'sendgrid') {
      return await sendViaSendGrid(queueItem, server);
    } else {
      return await sendViaSmtpProfessional(queueItem, server);
    }
  } catch (error: any) {
    console.error(`❌ [PROFESSIONAL] Erreur envoi ${server.type}:`, error.message);
    throw error;
  }
}

// Support Mailgun intégré au système professionnel
async function sendViaMailgun(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  const formData = new FormData();
  formData.append('from', `${server.from_name} <${server.from_email}>`);
  formData.append('to', queueItem.contact_email);
  formData.append('subject', queueItem.subject);
  formData.append('html', queueItem.html_content);
  formData.append('o:message-id', queueItem.message_id);

  const response = await fetch(`https://api.mailgun.net/v3/${server.domain}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${encodeBase64(`api:${server.api_key}`)}`
    },
    body: formData
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Mailgun error: ${result.message}`);
  }

  console.log(`✅ [PROFESSIONAL-MAILGUN] Email envoyé avec succès: ${result.id}`);
  return true;
}

// Support SendGrid intégré au système professionnel
async function sendViaSendGrid(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  const emailPayload = {
    personalizations: [{
      to: [{ email: queueItem.contact_email }]
    }],
    from: {
      email: server.from_email,
      name: server.from_name
    },
    subject: queueItem.subject,
    content: [{
      type: "text/html",
      value: queueItem.html_content
    }],
    custom_args: {
      campaign_message_id: queueItem.message_id
    }
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${server.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  console.log(`✅ [PROFESSIONAL-SENDGRID] Email envoyé avec succès`);
  return true;
}

// SMTP CORRIGÉ pour OVH/7TIC avec SSL adaptatif
async function sendViaSmtpProfessional(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  const isOvhServer = server.host?.includes('ovh.net');
  const timeout = isOvhServer ? 15000 : 8000; // Timeout plus long pour OVH
  
  try {
    console.log(`🔌 Connexion SMTP vers ${server.host}:${server.port}`);
    
    let socket: Deno.TlsConn | Deno.Conn;
    
    // CORRECTION SSL/TLS selon le port
    if (server.port === 465) {
      // Port 465 = SSL direct
      socket = await Deno.connectTls({
        hostname: server.host!,
        port: server.port,
      });
    } else {
      // Port 587 ou autres = connexion normale puis STARTTLS
      socket = await Deno.connect({
        hostname: server.host!,
        port: server.port,
      });
    }
    
    // Lire message de bienvenue
    await sendCommand(socket, '', '220', 3000); // Pas de commande, juste lire
    
    // EHLO
    await sendCommand(socket, `EHLO localhost`, '250', timeout);
    
    // STARTTLS seulement si port != 465
    if (server.port !== 465 && server.encryption === 'tls') {
      await sendCommand(socket, 'STARTTLS', '220', timeout);
      
      // Upgrade vers TLS
      socket = await Deno.startTls(socket as Deno.Conn, {
        hostname: server.host!,
      });
      
      // Nouvel EHLO après STARTTLS
      await sendCommand(socket, `EHLO localhost`, '250', timeout);
    }
    
    // Authentification
    await sendCommand(socket, 'AUTH LOGIN', '334', timeout);
    
    const username = btoa(server.username!);
    await sendCommand(socket, username, '334', timeout);
    
    const password = btoa(server.password!);
    await sendCommand(socket, password, '235', timeout);
    
    // MAIL FROM - CORRECTION : Accepter plusieurs codes de succès
    try {
      await sendCommand(socket, `MAIL FROM:<${server.from_email}>`, '250', timeout);
    } catch (error: any) {
      // OVH peut répondre 235 au lieu de 250 après MAIL FROM
      if (error.message.includes('235')) {
        console.log('✅ MAIL FROM accepté avec code 235 (OVH)');
      } else {
        throw error;
      }
    }
    
    // RCPT TO
    await sendCommand(socket, `RCPT TO:<${queueItem.contact_email}>`, '250', timeout);
    
    // DATA
    await sendCommand(socket, 'DATA', '354', timeout);
    
    // Envoyer contenu
    const emailContent = `From: ${server.from_email}\r\nTo: ${queueItem.contact_email}\r\nSubject: ${queueItem.subject}\r\n\r\n${queueItem.html_content}\r\n.`;
    await sendCommand(socket, emailContent, '250', timeout * 2); // Timeout double pour l'envoi
    
    // QUIT
    await sendCommand(socket, 'QUIT', '221', 2000);
    
    socket.close();
    
    console.log('✅ Email envoyé avec succès via SMTP professionnel');
    return true;
    
  } catch (error: any) {
    console.error('❌ Erreur SMTP:', error.message);
    return false;
  }
}

async function performSmtpOperation(queueItem: QueueItem, server: SmtpServer, signal: AbortSignal): Promise<boolean> {
  const { host, port, username, password, encryption, from_email, from_name } = server;
  
  if (!host || !port || !username || !password || !from_email) {
    throw new Error('Configuration SMTP incomplète');
  }

  let conn: Deno.TcpConn | null = null;
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  try {
    // Vérification d'annulation
    if (signal.aborted) throw new Error('Opération annulée');
    
    // FONCTION CORRIGÉE : Parsing SMTP multi-lignes pour OVH/7TIC
    const sendCommand = async (
      socket: Deno.TlsConn | Deno.Conn, 
      command: string, 
      expectedCode: string,
      timeoutMs: number = 8000
    ): Promise<string> => {
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
    };

    // Connexion TCP avec timeout court
    console.log(`🔌 [PROFESSIONAL-SMTP] Connexion TCP vers ${host}:${port}`);
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout connexion TCP (3s)')), 3000);
    });
    
    const connectPromise = Deno.connect({
      hostname: host,
      port: port,
    });
    
    conn = await Promise.race([connectPromise, connectTimeout]);
    console.log('✅ [PROFESSIONAL-SMTP] Connexion TCP établie');
    
    let stream = conn;
    
    // Détection SSL/TLS selon le port
    const useDirectSSL = port === 465 || encryption === 'ssl';
    const useSTARTTLS = port === 587 || encryption === 'tls';
    
    if (useDirectSSL) {
      console.log('🔒 [PROFESSIONAL-SMTP] Activation SSL directe (port 465)');
      stream = await Deno.startTls(conn, {
        hostname: host,
      });
      console.log('✅ [PROFESSIONAL-SMTP] SSL direct activé');
    }
    
    reader = stream.readable.getReader();
    writer = stream.writable.getWriter();
    
    // Lire le message de bienvenue avec timeout strict
    console.log('👋 [PROFESSIONAL-SMTP] Lecture du message de bienvenue...');
    const welcomeTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout sur message de bienvenue (2s)')), 2000);
    });
    
    const welcomePromise = (async () => {
      const result = await reader.read();
      if (result.done) throw new Error('Connexion fermée lors du welcome');
      
      const decoder = new TextDecoder();
      const response = decoder.decode(result.value);
      console.log(`📥 [PROFESSIONAL-SMTP] Welcome: ${response.trim()}`);
      
      if (!response.startsWith('220')) {
        throw new Error(`Message de bienvenue invalide: ${response.trim()}`);
      }
      
      return response;
    })();
    
    await Promise.race([welcomePromise, welcomeTimeout]);
    
    // EHLO
    await sendCommand(`EHLO ${host}\r\n`, '250');
    
    // STARTTLS si nécessaire (port 587)
    if (useSTARTTLS && !useDirectSSL) {
      console.log('🔒 [PROFESSIONAL-SMTP] Activation STARTTLS (port 587)');
      await sendCommand('STARTTLS\r\n', '220');
      
      // Upgrader vers TLS
      stream = await Deno.startTls(stream, {
        hostname: host,
      });
      
      reader = stream.readable.getReader();
      writer = stream.writable.getWriter();
      
      // Re-EHLO après STARTTLS
      await sendCommand(`EHLO ${host}\r\n`, '250');
      console.log('✅ [PROFESSIONAL-SMTP] STARTTLS activé');
    }
    
    // Authentication - gestion spéciale pour OVH/7TIC
    console.log('🔐 [PROFESSIONAL-SMTP] Début authentification LOGIN');
    
    try {
      // Pour OVH/7TIC, la commande AUTH LOGIN peut retourner directement 250 au lieu de 334
      const authResponse = await sendCommand('AUTH LOGIN\r\n');
      console.log(`🔍 [PROFESSIONAL-SMTP] Réponse AUTH LOGIN: ${authResponse.trim()}`);
      
      // Si on reçoit 334, c'est le comportement standard (challenge)
      if (authResponse.includes('334')) {
        console.log('📝 [PROFESSIONAL-SMTP] Challenge d\'authentification reçu (334)');
      }
      // Si on reçoit 250, le serveur OVH/7TIC accepte directement
      else if (authResponse.includes('250')) {
        console.log('✅ [PROFESSIONAL-SMTP] Serveur OVH/7TIC accepte AUTH LOGIN directement');
        // On continue avec les credentials en base64
      }
      else {
        throw new Error(`Réponse AUTH LOGIN inattendue: ${authResponse.trim()}`);
      }
      
      const usernameB64 = encodeBase64(username);
      const passwordB64 = encodeBase64(password);
      
      console.log('👤 [PROFESSIONAL-SMTP] Envoi username en base64');
      await sendCommand(`${usernameB64}\r\n`, '334');
      
      console.log('🔑 [PROFESSIONAL-SMTP] Envoi password en base64');
      await sendCommand(`${passwordB64}\r\n`, '235');
      
    } catch (authError: any) {
      console.error('❌ [PROFESSIONAL-SMTP] Erreur authentification:', authError.message);
      
      // Tentative avec AUTH PLAIN pour certains serveurs OVH/7TIC
      console.log('🔄 [PROFESSIONAL-SMTP] Tentative AUTH PLAIN en fallback');
      try {
        const authPlain = encodeBase64(`\0${username}\0${password}`);
        await sendCommand(`AUTH PLAIN ${authPlain}\r\n`, '235');
        console.log('✅ [PROFESSIONAL-SMTP] Authentification PLAIN réussie');
      } catch (plainError: any) {
        throw new Error(`Échec authentification LOGIN et PLAIN: ${authError.message} | ${plainError.message}`);
      }
    }
    
    console.log('✅ [PROFESSIONAL-SMTP] Authentification réussie');
    
    // Mail transaction - codes spéciaux pour OVH/7TIC
    // MAIL FROM peut retourner 235, 250, 251 ou 252 selon le serveur
    const mailFromResponse = await sendCommand(`MAIL FROM:<${from_email}>\r\n`);
    if (!mailFromResponse.includes('235') && !mailFromResponse.includes('250') && !mailFromResponse.includes('251') && !mailFromResponse.includes('252')) {
      throw new Error(`MAIL FROM rejeté: ${mailFromResponse.trim()}`);
    }
    console.log('✅ [PROFESSIONAL-SMTP] MAIL FROM accepté');
    
    await sendCommand(`RCPT TO:<${queueItem.contact_email}>\r\n`, '250');
    await sendCommand('DATA\r\n', '354');
    
    // Construire l'email avec headers complets et standards
    const messageId = queueItem.message_id || `${Date.now()}.${Math.random().toString(36)}@${host}`;
    const date = new Date().toUTCString().replace('GMT', '+0000');
    
    const emailContent = `Message-ID: <${messageId}>
Date: ${date}
From: ${from_name ? `"${from_name}" <${from_email}>` : from_email}
To: ${queueItem.contact_name ? `"${queueItem.contact_name}" <${queueItem.contact_email}>` : queueItem.contact_email}
Subject: ${queueItem.subject}
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 8bit
X-Mailer: Professional Email System v2.1

${queueItem.html_content}
.\r\n`;
    
    await sendCommand(emailContent, '250');
    
    // Fermeture propre
    await sendCommand('QUIT\r\n', '221');
    
    console.log('✅ [PROFESSIONAL-SMTP] Email envoyé avec succès');
    return true;
    
  } catch (error: any) {
    console.error('❌ [PROFESSIONAL-SMTP] Erreur:', error);
    
    // Tentative de fermeture propre en cas d'erreur
    try {
      if (writer) {
        await writer.write(new TextEncoder().encode('QUIT\r\n'));
      }
    } catch {}
    
    throw new Error(`Erreur de connexion: ${error.message}`);
    
  } finally {
    // Nettoyage des ressources
    try {
      if (reader) await reader.cancel();
      if (writer) await writer.close();
      if (conn) conn.close();
    } catch {}
  }

}

// SYSTÈME PROFESSIONNEL - Retry avec backoff exponentiel intelligent
async function sendWithProfessionalRetry(queueItem: QueueItem, server: SmtpServer, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 [PROFESSIONAL-RETRY] Tentative ${attempt}/${maxRetries} pour ${queueItem.contact_email} via ${server.type}`);

      const success = await sendEmailProfessional(queueItem, server);
      
      if (success) {
        markEmailSent(server.id, true);
        await logEmailStatus(queueItem.id, 'sent', `Email envoyé avec succès (tentative ${attempt})`, server.id);
        return true;
      }

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s - backoff plus agressif
        console.log(`⏳ [PROFESSIONAL-RETRY] Attente ${delay}ms avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error: any) {
      console.error(`❌ [PROFESSIONAL-RETRY] Erreur tentative ${attempt}:`, error.message);
      
      // Erreurs critiques - ne pas réessayer
      if (error.message.includes('550') || error.message.includes('553')) {
        await logEmailStatus(queueItem.id, 'failed', `Email invalide - arrêt des tentatives: ${error.message}`, server.id);
        markEmailSent(server.id, false);
        return false;
      }

      if (attempt === maxRetries) {
        await logEmailStatus(queueItem.id, 'failed', `Toutes les tentatives échouées: ${error.message}`, server.id);
        markEmailSent(server.id, false);
        return false;
      }

      const delay = Math.pow(2, attempt) * 2000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

// =============================================
// FONCTIONS UTILITAIRES TRACKING MULTI-TENANT
// =============================================

interface TrackingTokens {
  open: string;
  unsubscribe: string;
}

// Générer les tokens de tracking pour un email
async function generateTrackingTokens(
  emailQueueId: string, 
  campaignId: string,
  tenantId: string, 
  contactEmail: string
): Promise<TrackingTokens> {
  console.log(`🔐 Génération tokens tracking pour ${contactEmail} (tenant: ${tenantId})`);
  
  try {
    // Générer token pour ouverture
    const { data: openToken, error: openError } = await supabase.rpc('generate_tracking_token', {
      p_tenant_id: tenantId,
      p_email_queue_id: emailQueueId,
      p_campaign_id: campaignId,
      p_contact_email: contactEmail,
      p_token_type: 'open',
      p_original_url: null
    });

    if (openError) throw new Error(`Erreur token ouverture: ${openError.message}`);

    // Générer token pour désabonnement
    const { data: unsubscribeToken, error: unsubError } = await supabase.rpc('generate_tracking_token', {
      p_tenant_id: tenantId,
      p_email_queue_id: emailQueueId,
      p_campaign_id: campaignId,
      p_contact_email: contactEmail,
      p_token_type: 'unsubscribe',
      p_original_url: null
    });

    if (unsubError) throw new Error(`Erreur token désabonnement: ${unsubError.message}`);

    console.log(`✅ Tokens générés: ouverture=${openToken?.slice(0,10)}..., désabo=${unsubscribeToken?.slice(0,10)}...`);
    
    return {
      open: openToken,
      unsubscribe: unsubscribeToken
    };
  } catch (error: any) {
    console.error('❌ Erreur génération tokens:', error.message);
    throw error;
  }
}

// Générer token pour tracking de clic
async function generateClickTrackingToken(
  emailQueueId: string,
  campaignId: string, 
  tenantId: string,
  contactEmail: string,
  originalUrl: string
): Promise<string> {
  try {
    const { data: clickToken, error } = await supabase.rpc('generate_tracking_token', {
      p_tenant_id: tenantId,
      p_email_queue_id: emailQueueId,
      p_campaign_id: campaignId,
      p_contact_email: contactEmail,
      p_token_type: 'click',
      p_original_url: originalUrl
    });

    if (error) throw new Error(`Erreur token clic: ${error.message}`);
    return clickToken;
  } catch (error: any) {
    console.error('❌ Erreur génération token clic:', error.message);
    throw error;
  }
}

// Fonction utilitaire pour échapper les caractères spéciaux regex
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Réécrire tous les liens pour tracking des clics
async function rewriteLinksForClickTracking(
  html: string, 
  emailQueueId: string,
  campaignId: string,
  tenantId: string,
  contactEmail: string,
  trackingDomain: string
): Promise<string> {
  console.log(`🔗 Réécriture des liens pour tracking (domaine: ${trackingDomain})`);
  
  try {
    // Regex pour trouver tous les liens <a href="...">
    const linkRegex = /<a\s+([^>]*\s+)?href\s*=\s*["']([^"']+)["']([^>]*)>/gi;
    
    let processedHtml = html;
    const linksToReplace: Array<{original: string, tracking: string}> = [];
    let match;
    
    // Identifier tous les liens à remplacer
    while ((match = linkRegex.exec(html)) !== null) {
      const originalUrl = match[2];
      
      // Ignorer les liens de tracking déjà créés, mailto, tel, ancres
      if (
        originalUrl.includes(trackingDomain) ||
        originalUrl.startsWith('mailto:') ||
        originalUrl.startsWith('tel:') ||
        originalUrl.startsWith('#') ||
        originalUrl.includes('unsubscribe') ||
        originalUrl.includes('track-email')
      ) {
        continue;
      }
      
      // Générer token pour ce lien
      const clickToken = await generateClickTrackingToken(
        emailQueueId, 
        campaignId,
        tenantId,
        contactEmail, 
        originalUrl
      );
      
      const trackingUrl = `https://${trackingDomain}/functions/v1/track-email-click/${clickToken}`;
      
      linksToReplace.push({
        original: originalUrl,
        tracking: trackingUrl
      });
    }
    
    // Remplacer tous les liens identifiés
    for (const link of linksToReplace) {
      processedHtml = processedHtml.replace(
        new RegExp(escapeRegExp(link.original), 'g'),
        link.tracking
      );
    }
    
    console.log(`✅ ${linksToReplace.length} liens réécris pour tracking`);
    return processedHtml;
    
  } catch (error: any) {
    console.error('❌ Erreur réécriture liens:', error.message);
    // Retourner le HTML original en cas d'erreur
    return html;
  }
}

// Traiter l'email pour intégrer le tracking multi-tenant
async function processEmailForTracking(
  emailData: EmailQueueItemWithTenant, 
  tenant: any
): Promise<EmailQueueItemWithTenant> {
  console.log(`🎯 Traitement tracking pour ${emailData.contact_email} (tenant: ${tenant.company_name})`);
  
  try {
    // Générer les tokens de tracking
    const tokens = await generateTrackingTokens(
      emailData.id,
      emailData.campaign_id,
      emailData.tenant_id,
      emailData.contact_email
    );
    
    // Déterminer le domaine de tracking
    const trackingDomain = tenant.tracking_domain || `tracking.campaignforge.app`;
    
    // URLs de tracking personnalisées
    const pixelUrl = `https://${trackingDomain}/functions/v1/track-email-open/${tokens.open}`;
    const unsubscribeUrl = `https://${trackingDomain}/functions/v1/track-unsubscribe/${tokens.unsubscribe}`;
    
    console.log(`📍 Domaine tracking: ${trackingDomain}`);
    console.log(`📷 Pixel URL: ${pixelUrl.slice(0, 60)}...`);
    console.log(`🚫 Unsubscribe URL: ${unsubscribeUrl.slice(0, 60)}...`);
    
    // Modifier le HTML pour ajouter tracking
    let processedHtml = emailData.html_content;
    
    // 1. Réécrire tous les liens pour tracking des clics AVANT d'ajouter le pixel
    processedHtml = await rewriteLinksForClickTracking(
      processedHtml,
      emailData.id,
      emailData.campaign_id,
      emailData.tenant_id,
      emailData.contact_email,
      trackingDomain
    );
    
    // 2. Ajouter le pixel de tracking (invisible)
    if (processedHtml.includes('</body>')) {
      processedHtml = processedHtml.replace(
        '</body>', 
        `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; visibility:hidden !important; opacity:0 !important; position:absolute !important; left:-9999px !important;" alt="" /></body>`
      );
    } else {
      // Si pas de balise body, ajouter à la fin
      processedHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none !important; visibility:hidden !important; opacity:0 !important; position:absolute !important; left:-9999px !important;" alt="" />`;
    }
    
    // 3. Gérer le lien de désabonnement
    if (processedHtml.includes('{{unsubscribe_url}}')) {
      // Remplacer le placeholder par l'URL personnalisée
      processedHtml = processedHtml.replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
    } else if (!processedHtml.toLowerCase().includes('unsubscribe') && !processedHtml.toLowerCase().includes('désabonner')) {
      // Ajouter un lien de désabonnement si pas présent
      const unsubscribeFooter = `
        <div style="text-align:center; font-size:12px; color:#666; margin-top:30px; padding:20px; border-top:1px solid #eee;">
          <p style="margin:0;">
            Vous recevez cet email car vous êtes inscrit à notre liste de diffusion.<br>
            <a href="${unsubscribeUrl}" style="color:#666; text-decoration:underline;">Se désabonner de tous les emails</a>
          </p>
        </div>
      `;
      
      if (processedHtml.includes('</body>')) {
        processedHtml = processedHtml.replace('</body>', unsubscribeFooter + '</body>');
      } else {
        processedHtml += unsubscribeFooter;
      }
    }
    
    console.log(`✅ Email traité avec tracking (${processedHtml.length} caractères)`);
    
    return {
      ...emailData,
      html_content: processedHtml
    };
    
  } catch (error: any) {
    console.error(`❌ Erreur traitement tracking pour ${emailData.contact_email}:`, error.message);
    // Retourner l'email original en cas d'erreur pour ne pas bloquer l'envoi
    return emailData;
  }
}

// SYSTÈME PROFESSIONNEL - Traitement parallèle haute performance AVEC TRACKING
async function processEmailsBatchProfessional(queueItems: QueueItem[], smtpServers: SmtpServer[]): Promise<{ succeeded: number; failed: number }> {
  const maxConcurrency = 150; // Optimisation : 3x plus rapide pour 250k emails en 4h
  let succeeded = 0;
  let failed = 0;

  // Diviser en batches pour traitement parallèle optimisé
  const batches = [];
  for (let i = 0; i < queueItems.length; i += maxConcurrency) {
    batches.push(queueItems.slice(i, i + maxConcurrency));
  }

  console.log(`🚀 [PROFESSIONAL-BATCH] Traitement de ${queueItems.length} emails en ${batches.length} batches de ${maxConcurrency}`);

  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`📦 [PROFESSIONAL-BATCH] Traitement batch ${batchIndex + 1}/${batches.length} (${batch.length} emails)`);

    const promises = batch.map(async (queueItem) => {
      try {
        // Marquer comme en traitement
        await supabase
          .from('email_queue')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', queueItem.id);

        // NOUVEAU : Récupérer les infos du tenant pour le tracking
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('tenant_id')
          .eq('id', queueItem.campaign_id)
          .single();

        if (!campaignData?.tenant_id) {
          throw new Error('Tenant ID non trouvé pour la campagne');
        }

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, company_name, tracking_domain, brand_config')
          .eq('id', campaignData.tenant_id)
          .single();

        if (!tenant) {
          throw new Error('Tenant non trouvé');
        }

        // NOUVEAU : Traiter l'email pour intégrer le tracking multi-tenant
        const emailWithTenant: EmailQueueItemWithTenant = {
          ...queueItem,
          tenant_id: tenant.id
        };
        
        const processedEmail = await processEmailForTracking(emailWithTenant, tenant);
        console.log(`🎯 Email traité avec tracking pour ${processedEmail.contact_email}`);

        // Sélection intelligente du serveur SMTP
        const availableServer = smtpServers.find(server => 
          smtpStatsCache.get(server.id)?.isHealthy !== false && 
          checkSmtpLimits(server)
        );

        if (!availableServer) {
          throw new Error('Aucun serveur SMTP disponible dans le système professionnel');
        }

        // Envoyer l'email avec le contenu tracking intégré
        const success = await sendWithProfessionalRetry(processedEmail, availableServer);

        if (success) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
          
          console.log(`✅ Email envoyé avec tracking: ${processedEmail.contact_email}`);
          return { success: true };
        } else {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              retry_count: queueItem.retry_count + 1,
              error_message: 'Échec après plusieurs tentatives (système professionnel)',
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
          
          return { success: false };
        }

      } catch (error: any) {
        console.error(`❌ Erreur traitement email ${queueItem.contact_email}:`, error.message);
        
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            retry_count: queueItem.retry_count + 1,
            error_message: `[PROFESSIONAL+TRACKING] ${error.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);

        return { success: false };
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        succeeded++;
      } else {
        failed++;
      }
    });

    // Pause optimisée entre les batches
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return { succeeded, failed };
}

// Fonction pour détecter le type de serveur SMTP et adapter les paramètres
function getServerConfig(host: string, port: number) {
  const hostLower = host.toLowerCase();
  
  // Configuration spécifique par serveur
  const serverConfigs = {
    turboSmtp: {
      detect: (h: string) => h.includes('turbo-smtp.com'),
      name: 'Turbo SMTP',
      connectTimeout: 15000,
      readTimeout: 15000,
      sendTimeout: 20000,
      isKnownSlow: true,
      suggestions: [
        'Le serveur Turbo SMTP est connu pour être lent, ceci est normal',
        'Essayez le port 587 (STARTTLS) au lieu du port 465 (SSL)',
        'Vérifiez que pro.eu.turbo-smtp.com est accessible'
      ]
    },
    ovh7tic: {
      detect: (h: string) => h.includes('ovh.net') || h.includes('7tic'),
      name: '7TIC/OVH',
      connectTimeout: 10000,
      readTimeout: 8000,
      sendTimeout: 15000,
      isKnownSlow: false,
      suggestions: [
        'Pour OVH/7tic, utilisez votre adresse email complète comme nom d\'utilisateur',
        'Vérifiez les paramètres de sécurité de votre compte OVH',
        'Port 465 (SSL) ou 587 (STARTTLS) sont recommandés'
      ]
    },
    gmail: {
      detect: (h: string) => h.includes('gmail.com') || h.includes('google.com'),
      name: 'Gmail SMTP',
      connectTimeout: 8000,
      readTimeout: 8000,
      sendTimeout: 12000,
      isKnownSlow: false,
      suggestions: [
        'Pour Gmail, utilisez un mot de passe d\'application, pas votre mot de passe principal',
        'Activez l\'authentification à 2 facteurs et générez un mot de passe d\'app',
        'Utilisez le port 587 avec STARTTLS'
      ]
    },
    outlook: {
      detect: (h: string) => h.includes('outlook') || h.includes('live.com') || h.includes('hotmail'),
      name: 'Outlook/Hotmail',
      connectTimeout: 8000,
      readTimeout: 8000,
      sendTimeout: 12000,
      isKnownSlow: false,
      suggestions: [
        'Pour Outlook, utilisez l\'authentification moderne OAuth2 si possible',
        'Vérifiez les paramètres de sécurité de votre compte Microsoft',
        'Port 587 avec STARTTLS est recommandé'
      ]
    },
    generic: {
      detect: () => true, // fallback
      name: 'SMTP Générique',
      connectTimeout: 10000,
      readTimeout: 10000,
      sendTimeout: 15000,
      isKnownSlow: false,
      suggestions: [
        'Vérifiez les paramètres SMTP auprès de votre fournisseur',
        'Assurez-vous que les ports et protocoles de chiffrement sont corrects',
        'Contactez votre administrateur système si le problème persiste'
      ]
    }
  };

  // Détecter le type de serveur
  for (const [key, config] of Object.entries(serverConfigs)) {
    if (key !== 'generic' && config.detect(hostLower)) {
      return config;
    }
  }
  
  return serverConfigs.generic;
}

// Fonction pour générer des suggestions d'erreur spécifiques
function getErrorSuggestions(error: Error, serverConfig: any, host: string, port: number): string[] {
  const errorMsg = error.message.toLowerCase();
  
  // Suggestions spécifiques par type d'erreur
  if (errorMsg.includes('timeout') || errorMsg.includes('connexion')) {
    return [
      `Problème de connectivité avec ${serverConfig.name}`,
      `Vérifiez que ${host}:${port} est accessible depuis votre réseau`,
      'Contrôlez les paramètres de firewall',
      ...serverConfig.suggestions
    ];
  }
  
  if (errorMsg.includes('auth') || errorMsg.includes('535')) {
    return [
      `Erreur d'authentification sur ${serverConfig.name}`,
      'Vérifiez votre nom d\'utilisateur et mot de passe',
      ...serverConfig.suggestions
    ];
  }
  
  if (errorMsg.includes('550') || errorMsg.includes('address')) {
    return [
      'Adresse email rejetée par le serveur',
      'Vérifiez l\'adresse email de destination',
      `Consultez les restrictions de ${serverConfig.name}`,
      ...serverConfig.suggestions
    ];
  }
  
  // Suggestions génériques + suggestions spécifiques au serveur
  return [
    `Erreur avec le serveur ${serverConfig.name}`,
    'Vérifiez la configuration SMTP',
    ...serverConfig.suggestions
  ];
}

// SYSTÈME PROFESSIONNEL - Test SMTP avec serveur temporaire
async function testSmtpServerProfessional(testServer: any, testEmail: string, sendRealEmail: boolean = true) {
  const startTime = Date.now();
  
  // Détecter le type de serveur et adapter la configuration
  const serverConfig = getServerConfig(testServer.host, testServer.port);
  
  console.log(`🧪 [PROFESSIONAL-TEST] Test ${serverConfig.name} à ${testServer.host}:${testServer.port} pour ${testEmail}`);
  
  try {
    const testResult = await sendViaSmtpProfessional({
      id: 'test-' + Date.now(),
      campaign_id: 'test-campaign',
      contact_email: testEmail,
      contact_name: 'Test User',
      subject: `Test SMTP ${serverConfig.name} - ${new Date().toLocaleString('fr-FR')}`,
      html_content: `
        <h1>Test SMTP réussi</h1>
        <p>Ce test a été effectué avec succès depuis le système professionnel.</p>
        <p><strong>Serveur:</strong> ${testServer.host}:${testServer.port}</p>
        <p><strong>Type:</strong> ${serverConfig.name}</p>
        <p><strong>Email expéditeur:</strong> ${testServer.from_email}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
      message_id: `test-${Date.now()}@${testServer.host}`,
      retry_count: 0
    }, {
      id: 'test-server',
      type: 'smtp',
      host: testServer.host,
      port: testServer.port,
      username: testServer.username,
      password: testServer.password,
      encryption: testServer.encryption || 'tls',
      from_name: testServer.from_name || 'Test Sender',
      from_email: testServer.from_email,
      tenant_id: 'test-tenant'
    } as SmtpServer);

    const duration = Date.now() - startTime;
    
    if (testResult) {
      return {
        success: true,
        message: `Test réussi avec ${serverConfig.name} (${duration}ms)`,
        details: `Serveur: ${testServer.host}:${testServer.port} | Type: ${serverConfig.name} | Durée: ${duration}ms`,
        responseTime: duration
      };
    } else {
      throw new Error('Test échoué');
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [PROFESSIONAL-TEST] Erreur avec ${serverConfig.name}:`, error.message);
    
    // Générer des suggestions spécifiques au serveur et à l'erreur
    const suggestions = getErrorSuggestions(error, serverConfig, testServer.host, testServer.port);
    
    return {
      success: false,
      error: `Test échoué avec ${serverConfig.name}`,
      details: `${error.message} (${duration}ms) | Serveur: ${testServer.host}:${testServer.port}`,
      responseTime: duration,
      suggestions: suggestions
    };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📨 [PROFESSIONAL] Début du traitement avec body:', JSON.stringify({ ...requestBody, test_server: requestBody.test_server ? { ...requestBody.test_server, password: '***' } : undefined }));
    
    // MODE TEST - Nouveau système unifié
    if (requestBody.test_mode === true) {
      console.log('🧪 [PROFESSIONAL-TEST] Mode test activé');
      
      const { test_server, test_email, send_real_email = true } = requestBody;
      
      if (!test_server || !test_server.host || !test_server.port || !test_server.username || !test_server.password || !test_server.from_email || !test_email) {
        console.error('❌ [PROFESSIONAL-TEST] Paramètres de test manquants:', { 
          hasTestServer: !!test_server, 
          hasHost: !!test_server?.host,
          hasPort: !!test_server?.port,
          hasUsername: !!test_server?.username,
          hasPassword: !!test_server?.password,
          hasFromEmail: !!test_server?.from_email,
          hasTestEmail: !!test_email
        });
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Paramètres de test manquants',
            details: 'Vérifiez que tous les paramètres SMTP et l\'email de test sont fournis'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const result = await testSmtpServerProfessional(test_server, test_email, send_real_email);
      
      console.log('✅ [PROFESSIONAL-TEST] Résultat final:', result);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // MODE NORMAL - Traitement des emails en queue
    console.log('🚀 [PROFESSIONAL SYSTEM] Démarrage du traitement haute performance');

    // Récupérer les emails en attente avec optimisation
    const { data: queueItems, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(200); // Limite augmentée pour le système professionnel

    if (queueError) {
      throw new Error(`Erreur récupération queue: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucun email en attente (système professionnel)',
        processed: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Récupérer les serveurs SMTP actifs avec priorité
    const { data: smtpServers, error: smtpError } = await supabase
      .from('smtp_servers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (smtpError || !smtpServers || smtpServers.length === 0) {
      throw new Error('Aucun serveur SMTP configuré pour le système professionnel');
    }

    console.log(`📧 [PROFESSIONAL+TRACKING] Traitement de ${queueItems.length} emails via ${smtpServers.length} serveurs SMTP avec tracking intégré`);

    // Traitement avec le système professionnel haute performance + tracking multi-tenant
    const { succeeded, failed } = await processEmailsBatchProfessional(queueItems, smtpServers);

    console.log(`✅ [PROFESSIONAL+TRACKING] Traitement terminé: ${succeeded} succès, ${failed} échecs`);

    return new Response(JSON.stringify({
      success: true,
      processed: queueItems.length,
      succeeded,
      failed,
      message: `[PROFESSIONAL] ${succeeded} emails envoyés avec succès, ${failed} échoués`,
      system: 'professional-v2.0'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ [PROFESSIONAL] Erreur dans process-email-queue:", error);
    return new Response(JSON.stringify({
      success: false,
      error: `[PROFESSIONAL] ${error.message}`,
      system: 'professional-v2.0'
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
