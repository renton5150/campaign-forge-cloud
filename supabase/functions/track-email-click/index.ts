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

function detectDevice(request: Request): string {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  if (/mobile|android|iphone/.test(userAgent)) return 'mobile';
  if (/tablet|ipad/.test(userAgent)) return 'tablet';
  return 'desktop';
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

    console.log('Tracking email click with token:', token);

    // Récupérer les données du token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tracking_tokens')
      .select('tenant_id, email_queue_id, campaign_id, contact_email, original_url')
      .eq('token', token)
      .eq('token_type', 'click')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log('Invalid or expired token:', tokenError);
      return new Response('Invalid or expired token', { status: 404 });
    }

    if (!tokenData.original_url) {
      console.log('No original URL found for token');
      return new Response('No URL to redirect to', { status: 400 });
    }

    // Enregistrer le clic
    const { error: insertError } = await supabase
      .from('email_clicks')
      .insert({
        tenant_id: tokenData.tenant_id,
        email_queue_id: tokenData.email_queue_id,
        campaign_id: tokenData.campaign_id,
        contact_email: tokenData.contact_email,
        original_url: tokenData.original_url,
        ip_address: getClientIP(req),
        user_agent: req.headers.get('user-agent'),
        device_type: detectDevice(req)
      });

    if (insertError) {
      console.error('Error inserting email click:', insertError);
    } else {
      console.log('Email click tracked successfully for:', tokenData.contact_email);
    }

    // Rediriger vers l'URL originale
    return Response.redirect(tokenData.original_url, 302);

  } catch (error) {
    console.error('Error in track-email-click:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

serve(handler);