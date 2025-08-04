import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createTransport } from "npm:nodemailer@6.9.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  test_email: string;
  encryption?: string;
  sendRealEmail?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      host,
      port,
      username,
      password,
      from_email,
      from_name,
      test_email,
      encryption = 'tls',
      sendRealEmail = false
    }: TestEmailRequest = await req.json();

    console.log(`🚀 [NODEMAILER] Test SMTP: ${host}:${port} (${encryption})`);

    // Configuration Nodemailer selon l'encryption
    const transportConfig: any = {
      host,
      port,
      auth: {
        user: username,
        pass: password,
      },
    };

    // Gestion de l'encryption
    if (encryption === 'ssl' || port === 465) {
      transportConfig.secure = true; // SSL direct
    } else if (encryption === 'tls' || port === 587) {
      transportConfig.secure = false;
      transportConfig.requireTLS = true; // STARTTLS
    } else {
      transportConfig.secure = false;
    }

    // Options additionnelles pour les serveurs problématiques
    transportConfig.tls = {
      rejectUnauthorized: false, // Accepter les certificats auto-signés
    };

    console.log('📧 [NODEMAILER] Configuration:', {
      host,
      port,
      secure: transportConfig.secure,
      requireTLS: transportConfig.requireTLS,
    });

    const transporter = createTransport(transportConfig);

    // Test de connexion
    const startTime = Date.now();
    await transporter.verify();
    const responseTime = Date.now() - startTime;

    console.log(`✅ [NODEMAILER] Connexion SMTP réussie en ${responseTime}ms`);

    let emailSent = false;
    if (sendRealEmail) {
      try {
        const mailOptions = {
          from: `${from_name} <${from_email}>`,
          to: test_email,
          subject: 'Test SMTP - Envoi réussi',
          html: `
            <h2>🎉 Test SMTP réussi !</h2>
            <p>Votre serveur SMTP <strong>${host}:${port}</strong> fonctionne parfaitement.</p>
            <p><strong>Configuration testée :</strong></p>
            <ul>
              <li>Serveur : ${host}</li>
              <li>Port : ${port}</li>
              <li>Encryption : ${encryption}</li>
              <li>Temps de réponse : ${responseTime}ms</li>
            </ul>
            <p>Vous pouvez maintenant utiliser cette configuration pour vos envois d'emails.</p>
            <hr>
            <small>Test effectué le ${new Date().toLocaleString('fr-FR')}</small>
          `,
          text: `Test SMTP réussi ! Serveur: ${host}:${port}, Encryption: ${encryption}, Temps: ${responseTime}ms`
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`📤 [NODEMAILER] Email de test envoyé à ${test_email}`);
      } catch (emailError: any) {
        console.error('❌ [NODEMAILER] Erreur envoi email:', emailError.message);
        // Ne pas faire échouer le test si la connexion fonctionne mais l'envoi échoue
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: sendRealEmail && emailSent 
          ? `Connexion réussie et email envoyé en ${responseTime}ms`
          : `Connexion SMTP réussie en ${responseTime}ms`,
        details: `Serveur ${host}:${port} (${encryption}) - Test ${sendRealEmail ? 'complet' : 'rapide'}`,
        responseTime,
        emailSent,
        server: { host, port, encryption }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('❌ [NODEMAILER] Erreur test SMTP:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur de connexion SMTP',
        details: `Impossible de se connecter au serveur SMTP`,
        code: error.code || 'SMTP_ERROR'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // On retourne 200 pour que le front puisse traiter l'erreur
      }
    );
  }
});