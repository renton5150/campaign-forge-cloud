
import { supabase } from '@/integrations/supabase/client';
import { EmailToSend, SmtpRateLimits, CleanupResult } from '@/types/database';

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
      // Appel direct via query au lieu de RPC pour éviter les problèmes de types
      const { data: stuckEmails, error } = await supabase
        .from('email_queue')
        .select('id')
        .eq('status', 'processing')
        .lt('updated_at', new Date(Date.now() - 300000).toISOString()); // 5 minutes

      if (error) {
        console.error('❌ Error fetching stuck emails:', error);
        return;
      }

      if (stuckEmails && stuckEmails.length > 0) {
        const { error: updateError } = await supabase
          .from('email_queue')
          .update({ 
            status: 'pending',
            scheduled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', stuckEmails.map(e => e.id));

        if (updateError) {
          console.error('❌ Error cleaning stuck emails:', updateError);
        } else {
          console.log(`🧹 Cleaned up ${stuckEmails.length} stuck emails`);
        }
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }

  private async processBatch() {
    try {
      // Récupérer et marquer les emails à traiter directement
      const { data: emails, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(this.BATCH_SIZE);

      if (error) {
        console.error('❌ Error fetching emails:', error);
        return;
      }

      if (!emails || emails.length === 0) {
        return; // Pas d'emails à traiter
      }

      console.log(`📧 Processing ${emails.length} emails`);

      // Marquer comme processing
      const emailIds = emails.map(email => email.id);
      await supabase
        .from('email_queue')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .in('id', emailIds);

      // Traiter chaque email
      for (const email of emails) {
        const emailToSend: EmailToSend = {
          queue_id: email.id,
          campaign_id: email.campaign_id,
          recipient_email: email.contact_email,
          recipient_name: email.contact_name || email.contact_email,
          subject: email.subject,
          content_html: email.html_content,
          smtp_server_id: 'default', // À récupérer depuis la campagne
          message_id: email.message_id || `${email.id}-${Date.now()}`
        };

        await this.sendEmail(emailToSend);
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

      // Récupérer la configuration SMTP par défaut
      const { data: smtpServer, error: smtpError } = await supabase
        .from('smtp_servers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (smtpError || !smtpServer) {
        throw new Error(`SMTP server not found: ${smtpError?.message}`);
      }

      // Vérifier les limites de rate limiting
      const canSend = await this.checkRateLimit(smtpServer.id);
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
          smtpServerId: smtpServer.id,
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
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', email.queue_id);
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
      await this.markEmailFailed(email.queue_id, errorMessage, errorCode);
    }
  }

  private async markEmailFailed(queueId: string, errorMessage: string, errorCode: string) {
    try {
      // Récupérer le retry count actuel
      const { data: currentEmail } = await supabase
        .from('email_queue')
        .select('retry_count')
        .eq('id', queueId)
        .single();

      const retryCount = (currentEmail?.retry_count || 0) + 1;
      
      if (retryCount >= 3) {
        // Max retries atteint
        await supabase
          .from('email_queue')
          .update({
            status: 'failed',
            retry_count: retryCount,
            error_message: errorMessage,
            error_code: errorCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);
      } else {
        // Programmer un retry dans 2^retry_count minutes
        const nextTry = new Date(Date.now() + (Math.pow(2, retryCount) * 60000));
        await supabase
          .from('email_queue')
          .update({
            status: 'pending',
            retry_count: retryCount,
            scheduled_for: nextTry.toISOString(),
            error_message: errorMessage,
            error_code: errorCode,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);
      }
    } catch (error) {
      console.error('❌ Error updating failed email:', error);
    }
  }

  private async checkRateLimit(smtpServerId: string): Promise<boolean> {
    try {
      // Vérifier les limites via query directe
      const { data: rateLimit } = await supabase
        .from('smtp_rate_limits')
        .select('*')
        .eq('smtp_server_id', smtpServerId)
        .single();

      if (!rateLimit) return true; // Pas de limite configurée

      // Vérifier les limites par défaut
      const hourlyLimit = 100;
      const dailyLimit = 1000;

      return (rateLimit.emails_sent_hour || 0) < hourlyLimit && 
             (rateLimit.emails_sent_day || 0) < dailyLimit;
    } catch (error) {
      console.error('❌ Error checking rate limit:', error);
      return true; // En cas d'erreur, autoriser l'envoi
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale du worker
export const emailWorker = new EmailWorker();
