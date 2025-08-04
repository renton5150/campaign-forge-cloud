import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         'unknown';
}

function generateUnsubscribePage(tokenData: any, tenantConfig: any): string {
  const brandConfig = tenantConfig?.brand_config || {};
  const unsubscribeConfig = tenantConfig?.unsubscribe_page_config || {};
  
  const primaryColor = brandConfig.primary_color || '#3B82F6';
  const companyName = brandConfig.company_name || 'Notre entreprise';
  const logoUrl = brandConfig.logo_url || '';
  const pageTitle = unsubscribeConfig.page_title || 'Désabonnement';
  const successMessage = unsubscribeConfig.success_message || 'Vous avez été désabonné avec succès de nos communications.';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle} - ${companyName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8fafc;
            color: #334155;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: ${primaryColor};
            color: white;
            padding: 32px;
            text-align: center;
        }
        .logo {
            max-height: 60px;
            margin-bottom: 16px;
        }
        .content {
            padding: 32px;
            text-align: center;
        }
        .email {
            background: #f1f5f9;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: monospace;
            margin: 20px 0;
            word-break: break-all;
        }
        .form {
            margin: 24px 0;
        }
        .reason-select, .custom-reason {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 16px;
            margin: 8px 0;
            box-sizing: border-box;
        }
        .reason-select:focus, .custom-reason:focus {
            outline: none;
            border-color: ${primaryColor};
        }
        .button {
            background: ${primaryColor};
            color: white;
            border: none;
            padding: 12px 32px;
            font-size: 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .button:hover {
            opacity: 0.9;
        }
        .success {
            display: none;
            color: #059669;
            font-weight: 600;
        }
        .error {
            display: none;
            color: #dc2626;
            font-weight: 600;
        }
        ${unsubscribeConfig.custom_css || ''}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo">` : ''}
            <h1>${pageTitle}</h1>
        </div>
        <div class="content">
            <div id="unsubscribe-form">
                <p>Vous souhaitez vous désabonner de nos communications.</p>
                <div class="email">${tokenData.contact_email}</div>
                
                <div class="form">
                    <label for="reason">Pouvez-vous nous dire pourquoi ? (optionnel)</label>
                    <select id="reason" class="reason-select">
                        <option value="">Sélectionnez une raison</option>
                        <option value="too-frequent">Trop d'emails</option>
                        <option value="not-relevant">Contenu non pertinent</option>
                        <option value="never-subscribed">Je ne me suis jamais inscrit</option>
                        <option value="other">Autre raison</option>
                    </select>
                    <textarea id="custom-reason" class="custom-reason" placeholder="Précisez votre raison..." style="display: none;" rows="3"></textarea>
                </div>
                
                <button onclick="processUnsubscribe()" class="button">Confirmer le désabonnement</button>
            </div>
            
            <div id="success-message" class="success">
                <h2>✓ ${successMessage}</h2>
                <p>Vous ne recevrez plus d'emails de notre part.</p>
            </div>
            
            <div id="error-message" class="error">
                <h2>❌ Erreur</h2>
                <p>Une erreur s'est produite. Veuillez réessayer.</p>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('reason').addEventListener('change', function() {
            const customReasonTextarea = document.getElementById('custom-reason');
            if (this.value === 'other') {
                customReasonTextarea.style.display = 'block';
            } else {
                customReasonTextarea.style.display = 'none';
            }
        });

        async function processUnsubscribe() {
            const reason = document.getElementById('reason').value;
            const customReason = document.getElementById('custom-reason').value;
            const finalReason = reason === 'other' ? customReason : reason;

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reason: finalReason })
                });

                if (response.ok) {
                    document.getElementById('unsubscribe-form').style.display = 'none';
                    document.getElementById('success-message').style.display = 'block';
                } else {
                    throw new Error('Failed to unsubscribe');
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('error-message').style.display = 'block';
            }
        }
    </script>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();

    if (!token) {
      return new Response('Invalid token', { status: 400 });
    }

    // Récupérer les données du token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tracking_tokens')
      .select('tenant_id, email_queue_id, campaign_id, contact_email')
      .eq('token', token)
      .eq('token_type', 'unsubscribe')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log('Invalid or expired token:', tokenError);
      return new Response('Token de désabonnement invalide ou expiré', { status: 404 });
    }

    // Récupérer la configuration du tenant
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('company_name, brand_config, unsubscribe_page_config')
      .eq('id', tokenData.tenant_id)
      .single();

    if (req.method === 'GET') {
      // Afficher la page de désabonnement
      const html = generateUnsubscribePage(tokenData, tenantData);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (req.method === 'POST') {
      // Traiter le désabonnement
      const { reason } = await req.json();

      console.log('Processing unsubscribe for:', tokenData.contact_email);

      // Enregistrer le désabonnement
      const { error: insertError } = await supabase
        .from('unsubscribes')
        .insert({
          tenant_id: tokenData.tenant_id,
          contact_email: tokenData.contact_email,
          campaign_id: tokenData.campaign_id,
          reason: reason || null,
          ip_address: getClientIP(req),
          user_agent: req.headers.get('user-agent')
        });

      if (insertError && !insertError.message.includes('duplicate key')) {
        console.error('Error inserting unsubscribe:', insertError);
        return new Response('Error processing unsubscribe', { status: 500 });
      }

      // Mettre à jour le statut du contact
      await supabase
        .from('contacts')
        .update({ status: 'unsubscribed' })
        .eq('tenant_id', tokenData.tenant_id)
        .eq('email', tokenData.contact_email);

      console.log('Unsubscribe processed successfully for:', tokenData.contact_email);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error) {
    console.error('Error in track-unsubscribe:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

serve(handler);