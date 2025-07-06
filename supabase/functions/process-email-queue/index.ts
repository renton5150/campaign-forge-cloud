import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import nodemailer from 'npm:nodemailer@7.0.4';

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
  api_key: string | null;
  domain: string | null;
  region: string | null;
}

async function logEmailStatus(queueId: string, status: string, message: string) {
  await supabase
    .from('email_logs')
    .insert({
      email_queue_id: queueId,
      status,
      message,
    });
}

async function sendViaSmtp(queueItem: QueueItem, smtpServer: SmtpServer): Promise<boolean> {
  try {
    const transportConfig: any = {
      host: smtpServer.host,
      port: smtpServer.port || 587,
      secure: smtpServer.encryption === 'ssl',
      auth: {
        user: smtpServer.username,
        pass: smtpServer.password,
      },
    };

    if (smtpServer.encryption === 'tls') {
      transportConfig.secure = false;
      transportConfig.requireTLS = true;
    }

    const transporter = nodemailer.createTransporter(transportConfig);

    const mailOptions = {
      from: `${smtpServer.from_name} <${smtpServer.from_email}>`,
      to: queueItem.contact_email,
      subject: queueItem.subject,
      html: queueItem.html_content,
      messageId: queueItem.message_id,
    };

    const result = await transporter.sendMail(mailOptions);
    
    await logEmailStatus(queueItem.id, 'sent', `Message envoyé: ${result.messageId}`);
    return true;
  } catch (error: any) {
    await logEmailStatus(queueItem.id, 'failed', `Erreur SMTP: ${error.message}`);
    console.error('Erreur SMTP:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Démarrage du traitement de la queue email');

    // Récupérer les 5 premiers emails en attente
    const { data: queueItems, error: queueError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true })
      .limit(5);

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

    console.log(`📧 ${queueItems.length} emails à traiter`);

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const queueItem of queueItems) {
      try {
        console.log(`📤 Traitement email ${queueItem.id} pour ${queueItem.contact_email}`);

        // Marquer comme en cours de traitement
        await supabase
          .from('email_queue')
          .update({ status: 'processing' })
          .eq('id', queueItem.id);

        // Récupérer le serveur SMTP de la campagne
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .select(`
            *,
            smtp_servers!inner(*)
          `)
          .eq('id', queueItem.campaign_id)
          .single();

        if (campaignError || !campaign) {
          throw new Error(`Campagne non trouvée: ${campaignError?.message}`);
        }

        // Récupérer le serveur SMTP actif du tenant
        const { data: smtpServer, error: smtpError } = await supabase
          .from('smtp_servers')
          .select('*')
          .eq('tenant_id', campaign.tenant_id)
          .eq('is_active', true)
          .single();

        if (smtpError || !smtpServer) {
          throw new Error(`Serveur SMTP non configuré pour le tenant`);
        }

        let success = false;

        // Envoyer via SMTP
        if (smtpServer.type === 'smtp') {
          success = await sendViaSmtp(queueItem, smtpServer);
        } else {
          // Pour l'instant, on ne supporte que SMTP
          throw new Error(`Type de serveur non supporté: ${smtpServer.type}`);
        }

        // Mettre à jour le statut
        if (success) {
          await supabase
            .from('email_queue')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', queueItem.id);
          
          succeeded++;
          console.log(`✅ Email ${queueItem.id} envoyé avec succès`);
        } else {
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              retry_count: queueItem.retry_count + 1,
              error_message: 'Échec envoi SMTP',
            })
            .eq('id', queueItem.id);
          
          failed++;
          console.log(`❌ Échec envoi email ${queueItem.id}`);
        }

        processed++;

      } catch (error: any) {
        console.error(`❌ Erreur traitement email ${queueItem.id}:`, error);
        
        // Marquer comme échoué
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            retry_count: queueItem.retry_count + 1,
            error_message: error.message,
          })
          .eq('id', queueItem.id);

        await logEmailStatus(queueItem.id, 'failed', `Erreur traitement: ${error.message}`);
        failed++;
        processed++;
      }
    }

    console.log(`✅ Traitement terminé: ${processed} emails traités (${succeeded} réussis, ${failed} échoués)`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      succeeded,
      failed,
      message: `Traitement terminé: ${succeeded} réussis, ${failed} échoués`
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