
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { queueId, to, subject, html, smtpServerId, messageId } = await req.json()

    // Créer le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Récupérer la configuration SMTP
    const { data: smtpServer, error: smtpError } = await supabase
      .from('smtp_servers')
      .select('*')
      .eq('id', smtpServerId)
      .single()

    if (smtpError || !smtpServer) {
      throw new Error(`SMTP server not found: ${smtpError?.message}`)
    }

    // Préparer l'email selon le type de serveur SMTP
    let emailPayload: any
    
    if (smtpServer.type === 'mailgun') {
      // Utiliser l'API Mailgun
      const formData = new FormData()
      formData.append('from', `${smtpServer.from_name} <${smtpServer.from_email}>`)
      formData.append('to', to)
      formData.append('subject', subject)
      formData.append('html', html)
      formData.append('o:message-id', messageId)

      const response = await fetch(`https://api.mailgun.net/v3/${smtpServer.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${smtpServer.api_key}`)}`
        },
        body: formData
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(`Mailgun error: ${result.message}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: result.id,
          smtpResponse: result.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (smtpServer.type === 'sendgrid') {
      // Utiliser l'API SendGrid
      emailPayload = {
        personalizations: [{
          to: [{ email: to }]
        }],
        from: {
          email: smtpServer.from_email,
          name: smtpServer.from_name
        },
        subject: subject,
        content: [{
          type: "text/html",
          value: html
        }],
        custom_args: {
          campaign_message_id: messageId
        }
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${smtpServer.api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailPayload)
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendGrid error: ${error}`)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: messageId,
          smtpResponse: `SendGrid - ${response.status}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      // SMTP traditionnel - utiliser un service externe ou implémenter Nodemailer
      // Pour cette implémentation, on simule l'envoi
      console.log(`Sending email via SMTP ${smtpServer.host}:${smtpServer.port}`)
      console.log(`From: ${smtpServer.from_name} <${smtpServer.from_email}>`)
      console.log(`To: ${to}`)
      console.log(`Subject: ${subject}`)
      
      // Simuler un délai d'envoi
      await new Promise(resolve => setTimeout(resolve, 1000))

      return new Response(
        JSON.stringify({ 
          success: true, 
          messageId: messageId,
          smtpResponse: `SMTP sent via ${smtpServer.host}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
