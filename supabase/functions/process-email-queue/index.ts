
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

// Cache des statistiques SMTP en mémoire
const smtpStatsCache = new Map<string, SmtpStats>();

// Fonction pour encoder en base64
function encodeBase64(str: string): string {
  return btoa(str);
}

// Fonction pour logger les emails
async function logEmailStatus(queueId: string, status: string, message: string, serverId?: string) {
  try {
    await supabase.from('email_logs').insert({
      email_queue_id: queueId,
      status,
      message: `[${serverId || 'unknown'}] ${message}`,
    });
  } catch (error) {
    console.error('Erreur lors du logging:', error);
  }
}

// Fonction pour vérifier les limites SMTP
async function checkSmtpLimits(server: SmtpServer): Promise<boolean> {
  const stats = smtpStatsCache.get(server.id);
  if (!stats) return true;

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Réinitialiser les compteurs si nécessaire
  if (stats.lastSent < hourAgo) {
    stats.hourlySent = 0;
  }
  if (stats.lastSent < dayAgo) {
    stats.dailySent = 0;
  }

  // Vérifier les limites
  const hourlyLimit = server.hourly_limit || 1000;
  const dailyLimit = server.daily_limit || 10000;

  return stats.hourlySent < hourlyLimit && stats.dailySent < dailyLimit;
}

// Fonction pour marquer un envoi
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
    stats.isHealthy = stats.consecutiveFailures < 5;
  }

  stats.lastSent = new Date();
}

// Fonction pour envoyer via SMTP avec retry et gestion d'erreurs avancée
async function sendViaSmtpWithRetry(queueItem: QueueItem, server: SmtpServer, maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 Tentative ${attempt}/${maxRetries} pour ${queueItem.contact_email} via ${server.host}`);

      const success = await sendViaSmtp(queueItem, server);
      
      if (success) {
        markEmailSent(server.id, true);
        await logEmailStatus(queueItem.id, 'sent', `Email envoyé avec succès (tentative ${attempt})`, server.id);
        return true;
      }

      // Attendre avant la prochaine tentative (backoff exponentiel)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`⏳ Attente ${delay}ms avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error: any) {
      console.error(`❌ Erreur tentative ${attempt}:`, error.message);
      
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

      // Attendre avant la prochaine tentative
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return false;
}

// Fonction SMTP native Deno améliorée
async function sendViaSmtp(queueItem: QueueItem, server: SmtpServer): Promise<boolean> {
  const { host, port, username, password, encryption } = server;
  
  if (!host || !port || !username || !password) {
    throw new Error('Configuration SMTP incomplète');
  }

  console.log(`🔗 Connexion SMTP à ${host}:${port} pour ${queueItem.contact_email}`);
  
  let conn;
  const connectionTimeout = 30000; // 30 secondes

  try {
    // Connexion TCP avec timeout
    const connectPromise = Deno.connect({
      hostname: host,
      port: port,
      transport: 'tcp'
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de connexion SMTP')), connectionTimeout);
    });

    conn = await Promise.race([connectPromise, timeoutPromise]) as Deno.TcpConn;
    console.log('✅ Connexion TCP établie');

  } catch (error) {
    throw new Error(`Connexion SMTP échouée: ${error.message}`);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Fonction pour envoyer une commande avec timeout
  async function sendCommand(command: string, timeout = 10000): Promise<string> {
    console.log('📤 Envoi:', command.trim());
    
    const writePromise = conn.write(encoder.encode(command));
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout commande SMTP')), timeout);
    });

    await Promise.race([writePromise, timeoutPromise]);
    
    const buffer = new Uint8Array(4096);
    const readPromise = conn.read(buffer);
    const readTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout lecture SMTP')), timeout);
    });

    const bytesRead = await Promise.race([readPromise, readTimeoutPromise]) as number | null;
    const response = decoder.decode(buffer.subarray(0, bytesRead || 0));
    
    console.log('📥 Réponse:', response.trim());
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
      console.log('🔒 Connexion TLS établie');
      
      // Re-EHLO après TLS
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

    // Construction du message
    const emailContent = [
      `From: ${server.from_name} <${server.from_email}>`,
      `To: ${queueItem.contact_email}`,
      `Subject: ${queueItem.subject}`,
      `Message-ID: ${queueItem.message_id}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
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
    
    console.log(`✅ Email envoyé avec succès à ${queueItem.contact_email}`);
    return true;

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

// Fonction pour traiter les emails en parallèle
async function processEmailsBatch(queueItems: QueueItem[], smtpServers: SmtpServer[]): Promise<{ succeeded: number; failed: number }> {
  const maxConcurrency = 20; // Traitement parallèle de 20 emails
  let succeeded = 0;
  let failed = 0;

  // Diviser en batches
  const batches = [];
  for (let i = 0; i < queueItems.length; i += maxConcurrency) {
    batches.push(queueItems.slice(i, i + maxConcurrency));
  }

  for (const batch of batches) {
    const promises = batch.map(async (queueItem) => {
      try {
        // Marquer comme en traitement
        await supabase
          .from('email_queue')
          .update({ status: 'processing' })
          .eq('id', queueItem.id);

        // Sélectionner un serveur SMTP disponible
        const availableServer = smtpServers.find(server => 
          smtpStatsCache.get(server.id)?.isHealthy !== false && 
          checkSmtpLimits(server)
        );

        if (!availableServer) {
          throw new Error('Aucun serveur SMTP disponible');
        }

        const success = await sendViaSmtpWithRetry(queueItem, availableServer);

        if (success) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', queueItem.id);
          
          return { success: true };
        } else {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              retry_count: queueItem.retry_count + 1,
              error_message: 'Échec après plusieurs tentatives',
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
            error_message: error.message,
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

    // Petite pause entre les batches pour éviter la surcharge
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { succeeded, failed };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Démarrage du traitement de queue haute performance');

    // Récupérer les emails en attente (plus gros batch)
    const { data: queueItems, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true })
      .limit(100); // Traiter plus d'emails à la fois

    if (queueError) {
      throw new Error(`Erreur récupération queue: ${queueError.message}`);
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucun email en attente',
        processed: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Récupérer les serveurs SMTP disponibles
    const { data: smtpServers, error: smtpError } = await supabase
      .from('smtp_servers')
      .select('*')
      .eq('is_active', true);

    if (smtpError || !smtpServers || smtpServers.length === 0) {
      throw new Error('Aucun serveur SMTP configuré');
    }

    console.log(`📧 Traitement de ${queueItems.length} emails via ${smtpServers.length} serveurs SMTP`);

    // Traiter les emails en parallèle
    const { succeeded, failed } = await processEmailsBatch(queueItems, smtpServers);

    console.log(`✅ Traitement terminé: ${succeeded} réussis, ${failed} échoués`);

    return new Response(JSON.stringify({
      success: true,
      processed: queueItems.length,
      succeeded,
      failed,
      message: `${succeeded} emails envoyés avec succès, ${failed} échoués`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Erreur dans process-email-queue:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
