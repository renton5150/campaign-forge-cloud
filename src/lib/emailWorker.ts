
import { supabase } from '@/integrations/supabase/client';

// VERSION SIMPLIFIÉE DU WORKER POUR CORRIGER LES ERREURS TYPESCRIPT
export class EmailWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 5;
  private readonly INTERVAL_MS = 10000;

  async start() {
    if (this.isRunning) return;
    
    console.log('🚀 Email worker started (simplified version)');
    this.isRunning = true;
    
    // Version simplifiée - traitement direct sans RPC complexes
    this.intervalId = setInterval(async () => {
      await this.processBatchSimple();
    }, this.INTERVAL_MS);
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log('⏹️ Email worker stopped');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async processBatchSimple() {
    try {
      console.log('📧 Processing emails (simplified version)');
      
      // Récupérer les emails en pending de façon simple
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

      console.log(`📧 Found ${emails.length} emails to process`);

      // Marquer comme processing
      const emailIds = emails.map(email => email.id);
      await supabase
        .from('email_queue')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .in('id', emailIds);

      // Pour l'instant, simuler le traitement (à améliorer plus tard)
      for (const email of emails) {
        await this.sendEmailSimple(email);
        await this.delay(1000); // Délai entre chaque email
      }

    } catch (error) {
      console.error('❌ Error in email worker:', error);
    }
  }

  private async sendEmailSimple(email: any) {
    try {
      console.log(`📧 Processing email to ${email.contact_email}`);
      
      // Récupérer le serveur SMTP actif de façon simple
      const { data: smtpServer, error: smtpError } = await supabase
        .from('smtp_servers')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (smtpError || !smtpServer) {
        throw new Error(`SMTP server not found: ${smtpError?.message}`);
      }

      // Appel à l'Edge Function d'envoi d'email
      const { data: response, error: sendError } = await supabase.functions.invoke('send-email-via-smtp', {
        body: {
          queueId: email.id,
          to: email.contact_email,
          subject: email.subject,
          html: email.html_content,
          smtpServerId: smtpServer.id,
          messageId: email.message_id || `${email.id}-${Date.now()}`
        }
      });

      if (sendError) {
        throw new Error(sendError.message);
      }

      if (response?.success) {
        console.log(`✅ Email sent to ${email.contact_email}`);
        
        // Marquer comme envoyé
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', email.id);
      } else {
        throw new Error(response?.error || 'Send failed');
      }

    } catch (error: any) {
      console.error(`❌ Failed to send email to ${email.contact_email}:`, error);
      
      // Marquer comme échoué
      await this.markEmailFailedSimple(email.id, error.message);
    }
  }

  private async markEmailFailedSimple(queueId: string, errorMessage: string) {
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
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);
      } else {
        // Programmer un retry
        const nextTry = new Date(Date.now() + (Math.pow(2, retryCount) * 60000));
        await supabase
          .from('email_queue')
          .update({
            status: 'pending',
            retry_count: retryCount,
            scheduled_for: nextTry.toISOString(),
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', queueId);
      }
    } catch (error) {
      console.error('❌ Error updating failed email:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale du worker
export const emailWorker = new EmailWorker();
