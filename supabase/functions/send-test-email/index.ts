
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

interface TestEmailRequest {
  to: string;
  subject: string;
  html_content: string;
  from_name: string;
  from_email: string;
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

    // Configuration du transporteur SMTP
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

    const transporter = nodemailer.createTransport(transportConfig);

    // Préparation du message
    const mailOptions = {
      from: `${from_name} <${from_email}>`,
      to: to,
      subject: `[TEST] ${subject}`,
      html: html_content,
    };

    console.log('📤 Envoi en cours...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de test envoyé avec succès:', result.messageId);

    return new Response(JSON.stringify({
      success: true,
      messageId: result.messageId,
      message: 'Email de test envoyé avec succès'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi du test:', error);
    
    let errorMessage = 'Erreur lors de l\'envoi du test';
    let statusCode = 500;

    // Gestion spécifique des erreurs SMTP
    if (error.code === 'EENVELOPE' || error.responseCode === 566) {
      errorMessage = 'Limite SMTP atteinte. Votre serveur SMTP a atteint sa limite d\'envoi quotidienne ou horaire. Veuillez attendre ou vérifier votre quota.';
      statusCode = 429; // Too Many Requests
    } else if (error.responseCode === 535) {
      errorMessage = 'Erreur d\'authentification SMTP. Vérifiez vos identifiants dans la configuration du serveur SMTP.';
      statusCode = 401;
    } else if (error.responseCode === 550) {
      errorMessage = 'Adresse email refusée par le serveur SMTP. Vérifiez l\'adresse de destination.';
      statusCode = 400;
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Impossible de se connecter au serveur SMTP. Vérifiez la configuration du serveur.';
      statusCode = 503;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      responseCode: error.responseCode || null
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
