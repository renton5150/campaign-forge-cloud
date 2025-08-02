
import { supabase } from '@/integrations/supabase/client';

export interface EmailToSend {
  queue_id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  content_html: string;
  smtp_server_id: string;
  message_id: string;
}

export class EmailWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 5; // Emails par batch
  private readonly INTERVAL_MS = 10000; // 10 secondes entre les batches
  private readonly SMTP_TIMEOUT = 30000; // 30 secondes max par email
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes pour cleanup

  async start() {
    if (this.isRunning) return;
    
    console.log('🚀 Email worker started');
    this.isRunning = true;
    
    // Nettoyer les emails bloqués au démarrage
    await this.cleanupStuckEmails();
    
    // Traitement immédiat puis interval
    await this.processBatch();
    
    this.intervalId = setInterval(async () => {
      await this.processBatch();
    }, this.INTERVAL_MS);

    // Nettoyage périodique des emails bloqués
    this.cleanupIntervalId = setInterval(async () => {
      await this.cleanupStuckEmails();
    }, this.CLEANUP_INTERVAL);
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('⏹️ Email worker stopped');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  private async cleanupStuckEmails() {
    try {
      const { data: cleanedCount, error } = await supabase.rpc('cleanup_stuck_emails');
      if (error) {
        console.error('❌ Error cleaning stuck emails:', error);
      } else if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} stuck emails`);
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }

  private async processBatch() {
    try {
      // Récupérer les emails à envoyer
      const { data: emails, error } = await supabase.rpc('get_emails_to_send', {
        p_limit: this.BATCH_SIZE
      });

      if (error) {
        console.error('❌ Error fetching emails:', error);
        return;
      }

      if (!emails || emails.length === 0) {
        return; // Pas d'emails à traiter
      }

      console.log(`📧 Processing ${emails.length} emails`);

      // Traiter chaque email
      for (const email of emails) {
        await this.sendEmail(email);
        // Délai entre chaque envoi pour respecter le rate limiting
        await this.delay(1000); // 1 seconde entre chaque email
      }

    } catch (error) {
      console.error('❌ Error in email worker:', error);
    }
  }

  private async sendEmail(email: EmailToSend) {
    try {
      // PROTECTION CRITIQUE : Vérifier que l'email n'a pas déjà été traité
      const { data: currentStatus, error: statusError } = await supabase
        .from('email_queue')
        .select('status')
        .eq('id', email.queue_id)
        .single();

      if (statusError || !currentStatus) {
        console.log(`⚠️ Cannot verify status for email ${email.queue_id}, skipping`);
        return;
      }

      if (currentStatus.status !== 'processing') {
        console.log(`⚠️ Email ${email.queue_id} already processed by another worker (status: ${currentStatus.status}), skipping`);
        return;
      }

      // Récupérer la configuration SMTP
      const { data: smtpServer, error: smtpError } = await supabase
        .from('smtp_servers')
        .select('*')
        .eq('id', email.smtp_server_id)
        .single();

      if (smtpError || !smtpServer) {
        throw new Error(`SMTP server not found: ${smtpError?.message}`);
      }

      // Vérifier les limites de rate limiting
      const canSend = await this.checkRateLimit(email.smtp_server_id, smtpServer);
      if (!canSend) {
        console.log(`⏳ Rate limit reached for SMTP ${smtpServer.name}, skipping`);
        // Remettre l'email en pending pour plus tard
        await supabase
          .from('email_queue')
          .update({ 
            status: 'pending', 
            scheduled_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes plus tard
            updated_at: new Date().toISOString()
          })
          .eq('id', email.queue_id);
        return;
      }

      // ENVOI AVEC TIMEOUT STRICT via Edge Function
      const sendPromise = supabase.functions.invoke('send-email-via-smtp', {
        body: {
          queueId: email.queue_id,
          to: email.recipient_email,
          subject: email.subject,
          html: email.content_html,
          smtpServerId: email.smtp_server_id,
          messageId: email.message_id
        }
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('SMTP_TIMEOUT')), this.SMTP_TIMEOUT)
      );

      const response = await Promise.race([sendPromise, timeoutPromise]) as any;

      if (response.data?.success) {
        console.log(`✅ Email sent to ${email.recipient_email}`);
        
        // Marquer comme envoyé
        await supabase.rpc('mark_email_sent', {
          p_queue_id: email.queue_id,
          p_smtp_response: response.data.smtpResponse
        });
      } else {
        throw new Error(response.data?.error || response.error?.message || 'Send failed');
      }

    } catch (error: any) {
      console.error(`❌ Failed to send email to ${email.recipient_email}:`, error);
      
      // Gestion spéciale du timeout
      const errorCode = error.message === 'SMTP_TIMEOUT' ? 'SMTP_TIMEOUT' : 'SEND_ERROR';
      const errorMessage = error.message === 'SMTP_TIMEOUT' 
        ? 'SMTP server timeout - email will be retried later'
        : error.message;
      
      // Marquer comme échoué avec retry
      await supabase.rpc('mark_email_failed', {
        p_queue_id: email.queue_id,
        p_error_message: errorMessage,
        p_error_code: errorCode
      });
    }
  }

  private async checkRateLimit(smtpServerId: string, smtpServer: any): Promise<boolean> {
    // Récupérer les limites actuelles
    const { data: rateLimit } = await supabase
      .from('smtp_rate_limits')
      .select('*')
      .eq('smtp_server_id', smtpServerId)
      .single();

    if (!rateLimit) return true; // Pas de limite configurée

    // Vérifier les limites (exemple : 100/heure, 1000/jour)
    const hourlyLimit = smtpServer.hourly_limit || 100;
    const dailyLimit = smtpServer.daily_limit || 1000;

    return rateLimit.emails_sent_hour < hourlyLimit && 
           rateLimit.emails_sent_day < dailyLimit;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale du worker
export const emailWorker = new EmailWorker();
