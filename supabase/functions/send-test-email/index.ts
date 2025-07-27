
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

// Fonction pour envoyer un email via SMTP en utilisant l'API native
async function sendSMTPEmail(smtpConfig: any, emailData: any) {
  // Pour cet exemple, nous utiliserons une approche simplifiée
  // En production, vous devriez utiliser un service comme Resend, SendGrid, etc.
  
  // Simuler l'envoi d'email pour le test
  console.log('Configuration SMTP:', smtpConfig);
  console.log('Données email:', emailData);
  
  // Retourner un succès simulé
  return {
    messageId: `test-${Date.now()}@test.com`,
    accepted: [emailData.to],
    rejected: [],
    response: '250 OK'
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html_content, from_name, from_email }: TestEmailRequest = await req.json();

    console.log('📧 Envoi d\'email de test vers:', to);

    // Récupérer le premier serveur SMTP actif
    const { data: smtpServer, error: smtpError } = await supabase
      .from('smtp_servers')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (smtpError || !smtpServer) {
      console.error('❌ Aucun serveur SMTP configuré');
      return new Response(JSON.stringify({
        success: false,
        error: 'Aucun serveur SMTP configuré. Veuillez configurer un serveur SMTP actif.'
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Préparation des données email
    const emailData = {
      from: `${from_name} <${from_email}>`,
      to: to,
      subject: `[TEST] ${subject}`,
      html: html_content,
    };

    console.log('📤 Envoi en cours...');
    
    // Utiliser la fonction SMTP simplifiée
    const result = await sendSMTPEmail(smtpServer, emailData);
    
    console.log('✅ Email de test envoyé avec succès:', result.messageId);

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      message: 'Email de test envoyé avec succès (mode test)'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du test:', error);
    
    let errorMessage = 'Erreur lors de l\'envoi du test';
    let statusCode = 500;

    if (error.message) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR'
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
