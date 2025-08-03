
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

// SMTP professionnel optimisé avec timeouts fixes
async function sendViaSmtpProfessional(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  const { host, port, username, password, encryption } = server;
  
  if (!host || !port || !username || !password) {
    throw new Error('Configuration SMTP incomplète');
  }

  console.log(`🔗 [PROFESSIONAL-SMTP] Connexion à ${host}:${port} pour ${queueItem.contact_email}`);
  
  let conn;
  const connectionTimeout = 30000; // Timeout fixé à 30s pour le système professionnel

  try {
    const connectPromise = Deno.connect({
      hostname: host,
      port: port,
      transport: 'tcp'
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de connexion SMTP (30s)')), connectionTimeout);
    });

    conn = await Promise.race([connectPromise, timeoutPromise]) as Deno.TcpConn;
    console.log('✅ [PROFESSIONAL-SMTP] Connexion TCP établie');

  } catch (error) {
    throw new Error(`Connexion SMTP échouée: ${error.message}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Fonction pour envoyer une commande avec timeout unifié
  async function sendCommand(command: string, timeout = 30000): Promise<string> {
    console.log('📤 [PROFESSIONAL-SMTP] Envoi:', command.trim());
    
    const writePromise = conn.write(encoder.encode(command));
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout commande SMTP (30s)')), timeout);
    });

    await Promise.race([writePromise, timeoutPromise]);
    
    const buffer = new Uint8Array(4096);
    const readPromise = conn.read(buffer);
    const readTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout lecture SMTP (30s)')), timeout);
    });

    const bytesRead = await Promise.race([readPromise, readTimeoutPromise]) as number | null;
    const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
    
    console.log('📥 [PROFESSIONAL-SMTP] Réponse:', response.trim());
    return response;
  }

  try {
    // 1. Lire le message de bienvenue
    const welcomeBuffer = new Uint8Array(1024);
    const welcomeBytesRead = await conn.read(welcomeBuffer);
    const welcomeResponse = decoder.decode(welcomeBuffer.subarray(0, welcomeBytesRead || 0));
    
    if (!welcomeResponse.startsWith('220')) {
      throw new Error(`Erreur de connexion: ${welcomeResponse.trim()}`);
    }

    // 2. EHLO
    const ehloResponse = await sendCommand(`EHLO ${host}\r\n`);
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehloResponse.trim()}`);
    }

    // 3. STARTTLS si nécessaire
    if (encryption === 'tls') {
      const startTlsResponse = await sendCommand('STARTTLS\r\n');
      if (!startTlsResponse.startsWith('220')) {
        throw new Error(`Erreur STARTTLS: ${startTlsResponse.trim()}`);
      }
      
      conn = await Deno.startTls(conn, { hostname: host });
      console.log('🔒 [PROFESSIONAL-SMTP] Connexion TLS établie');
      
      const ehloTlsResponse = await sendCommand(`EHLO ${host}\r\n`);
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(`Erreur EHLO après TLS: ${ehloTlsResponse.trim()}`);
      }
    }

    // 4. Authentification
    const authResponse = await sendCommand('AUTH LOGIN\r\n');
    if (!authResponse.startsWith('334')) {
      throw new Error(`Erreur AUTH LOGIN: ${authResponse.trim()}`);
    }

    const userResponse = await sendCommand(`${encodeBase64(username)}\r\n`);
    if (!userResponse.startsWith('334')) {
      throw new Error(`Erreur nom d'utilisateur: ${userResponse.trim()}`);
    }

    const passResponse = await sendCommand(`${encodeBase64(password)}\r\n`);
    if (!passResponse.startsWith('235')) {
      throw new Error(`Erreur mot de passe: ${passResponse.trim()}`);
    }

    // 5. Envoi de l'email
    const mailFromResponse = await sendCommand(`MAIL FROM:<${server.from_email}>\r\n`);
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`Erreur MAIL FROM: ${mailFromResponse.trim()}`);
    }

    const rcptToResponse = await sendCommand(`RCPT TO:<${queueItem.contact_email}>\r\n`);
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(`Erreur RCPT TO: ${rcptToResponse.trim()}`);
    }

    const dataResponse = await sendCommand('DATA\r\n');
    if (!dataResponse.startsWith('354')) {
      throw new Error(`Erreur DATA: ${dataResponse.trim()}`);
    }

    // Construction du message avec headers professionnels
    const emailContent = [
      `From: ${server.from_name} <${server.from_email}>`,
      `To: ${queueItem.contact_email}`,
      `Subject: ${queueItem.subject}`,
      `Message-ID: ${queueItem.message_id}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'X-Mailer: Professional Email System v2.0',
      '',
      queueItem.html_content,
      '.',
      ''
    ].join('\r\n');

    const contentResponse = await sendCommand(emailContent);
    if (!contentResponse.startsWith('250')) {
      throw new Error(`Erreur envoi contenu: ${contentResponse.trim()}`);
    }

    await sendCommand('QUIT\r\n');
    
    console.log(`✅ [PROFESSIONAL-SMTP] Email envoyé avec succès à ${queueItem.contact_email}`);
    return true;

  } catch (error) {
    console.error('❌ [PROFESSIONAL-SMTP] Erreur:', error);
    throw error;
  } finally {
    try {
      conn.close();
    } catch (e) {
      console.log('[PROFESSIONAL-SMTP] Connexion déjà fermée');
    }
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

// SYSTÈME PROFESSIONNEL - Traitement parallèle haute performance
async function processEmailsBatchProfessional(queueItems: QueueItem[], smtpServers: SmtpServer[]): Promise<{ succeeded: number; failed: number }> {
  const maxConcurrency = 50; // Concurrence augmentée pour le système professionnel
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

        // Sélection intelligente du serveur SMTP
        const availableServer = smtpServers.find(server => 
          smtpStatsCache.get(server.id)?.isHealthy !== false && 
          checkSmtpLimits(server)
        );

        if (!availableServer) {
          throw new Error('Aucun serveur SMTP disponible dans le système professionnel');
        }

        const success = await sendWithProfessionalRetry(queueItem, availableServer);

        if (success) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);
          
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
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            retry_count: queueItem.retry_count + 1,
            error_message: `[PROFESSIONAL] ${error.message}`,
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`📧 [PROFESSIONAL] Traitement de ${queueItems.length} emails via ${smtpServers.length} serveurs SMTP`);

    // Traitement avec le système professionnel haute performance
    const { succeeded, failed } = await processEmailsBatchProfessional(queueItems, smtpServers);

    console.log(`✅ [PROFESSIONAL] Traitement terminé: ${succeeded} réussis, ${failed} échoués`);

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
