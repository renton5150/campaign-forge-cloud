import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pixel transparent 1x1
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x04, 0x01, 0x00, 0x3B
]);

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

function detectEmailClient(request: Request): string {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  if (/outlook/.test(userAgent)) return 'Outlook';
  if (/thunderbird/.test(userAgent)) return 'Thunderbird';
  if (/apple mail/.test(userAgent)) return 'Apple Mail';
  if (/gmail/.test(userAgent)) return 'Gmail';
  return 'Unknown';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.pathname.split('/').pop();

    if (!token) {
      return new Response(TRACKING_PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
      });
    }

    console.log('Tracking email open with token:', token);

    // Récupérer les données du token
    const { data: tokenData, error: tokenError } = await supabase
      .from('tracking_tokens')
      .select('tenant_id, email_queue_id, campaign_id, contact_email')
      .eq('token', token)
      .eq('token_type', 'open')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log('Invalid or expired token:', tokenError);
      return new Response(TRACKING_PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
      });
    }

    // Vérifier si l'ouverture n'a pas déjà été enregistrée
    const { data: existingOpen } = await supabase
      .from('email_opens')
      .select('id')
      .eq('email_queue_id', tokenData.email_queue_id)
      .eq('contact_email', tokenData.contact_email)
      .single();

    if (!existingOpen) {
      // Enregistrer l'ouverture
      const { error: insertError } = await supabase
        .from('email_opens')
        .insert({
          tenant_id: tokenData.tenant_id,
          email_queue_id: tokenData.email_queue_id,
          campaign_id: tokenData.campaign_id,
          contact_email: tokenData.contact_email,
          ip_address: getClientIP(req),
          user_agent: req.headers.get('user-agent'),
          device_type: detectDevice(req),
          email_client: detectEmailClient(req)
        });

      if (insertError) {
        console.error('Error inserting email open:', insertError);
      } else {
        console.log('Email open tracked successfully for:', tokenData.contact_email);
      }
    }

    // Retourner le pixel transparent
    return new Response(TRACKING_PIXEL, {
      headers: { 
        'Content-Type': 'image/gif', 
        'Cache-Control': 'no-cache',
        'Content-Length': TRACKING_PIXEL.length.toString()
      }
    });

  } catch (error) {
    console.error('Error in track-email-open:', error);
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' }
    });
  }
};

serve(handler);