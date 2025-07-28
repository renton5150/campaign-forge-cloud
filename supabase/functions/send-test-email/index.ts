
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SMTPConfig {
  host: string
  port: number
  username: string
  password: string
  from_email: string
  from_name: string
}

async function sendTestEmail(config: SMTPConfig, testEmail: string) {
  let socket: Deno.TcpConn | null = null
  
  try {
    console.log(`Connexion SMTP à ${config.host}:${config.port}`)
    
    // Connexion au serveur SMTP
    socket = await Deno.connect({
      hostname: config.host,
      port: config.port,
    })
    
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Fonction pour lire les réponses SMTP
    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024)
      const n = await socket!.read(buffer)
      if (n === null) throw new Error("Connexion fermée par le serveur")
      return decoder.decode(buffer.subarray(0, n))
    }
    
    // Fonction pour envoyer des commandes SMTP
    const sendCommand = async (command: string): Promise<string> => {
      console.log(`>>> ${command}`)
      await socket!.write(encoder.encode(command + "\r\n"))
      const response = await readResponse()
      console.log(`<<< ${response.trim()}`)
      return response.trim()
    }
    
    // 1. Lire le message de bienvenue
    const welcome = await readResponse()
    console.log(`<<< ${welcome.trim()}`)
    
    if (!welcome.startsWith('220')) {
      throw new Error(`Erreur de connexion SMTP: ${welcome}`)
    }
    
    // 2. EHLO
    const ehloResponse = await sendCommand(`EHLO ${config.host}`)
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehloResponse}`)
    }
    
    // 3. STARTTLS si supporté
    if (ehloResponse.includes('STARTTLS')) {
      const tlsResponse = await sendCommand('STARTTLS')
      if (!tlsResponse.startsWith('220')) {
        throw new Error(`Erreur STARTTLS: ${tlsResponse}`)
      }
      
      // Upgrade vers TLS
      socket = await Deno.startTls(socket, { hostname: config.host })
      
      // Nouveau EHLO après TLS
      const ehloTlsResponse = await sendCommand(`EHLO ${config.host}`)
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(`Erreur EHLO après TLS: ${ehloTlsResponse}`)
      }
    }
    
    // 4. Authentification
    const authResponse = await sendCommand('AUTH LOGIN')
    if (!authResponse.startsWith('334')) {
      throw new Error(`Erreur AUTH LOGIN: ${authResponse}`)
    }
    
    // Encoder username en base64
    const usernameB64 = btoa(config.username)
    const userResponse = await sendCommand(usernameB64)
    if (!userResponse.startsWith('334')) {
      throw new Error(`Erreur nom d'utilisateur: ${userResponse}`)
    }
    
    // Encoder password en base64
    const passwordB64 = btoa(config.password)
    const passResponse = await sendCommand(passwordB64)
    if (!passResponse.startsWith('235')) {
      throw new Error(`Erreur mot de passe: ${passResponse}`)
    }
    
    // 5. MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${config.from_email}>`)
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`Erreur MAIL FROM: ${mailFromResponse}`)
    }
    
    // 6. RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${testEmail}>`)
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(`Erreur RCPT TO: ${rcptToResponse}`)
    }
    
    // 7. DATA
    const dataResponse = await sendCommand('DATA')
    if (!dataResponse.startsWith('354')) {
      throw new Error(`Erreur DATA: ${dataResponse}`)
    }
    
    // 8. Contenu de l'email avec headers complets
    const messageId = `<test-${Date.now()}@${config.host}>`
    const date = new Date().toUTCString()
    
    const emailContent = [
      `Message-ID: ${messageId}`,
      `Date: ${date}`,
      `From: ${config.from_name} <${config.from_email}>`,
      `To: ${testEmail}`,
      `Subject: =?UTF-8?B?${btoa('Test de connexion SMTP')}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      `X-Mailer: Custom SMTP Client`,
      ``,
      `Ceci est un email de test pour vérifier la configuration SMTP.`,
      ``,
      `Configuration testée :`,
      `- Serveur : ${config.host}:${config.port}`,
      `- Utilisateur : ${config.username}`,
      `- Date du test : ${date}`,
      ``,
      `Si vous recevez cet email, la configuration SMTP fonctionne correctement.`,
      `.`
    ].join('\r\n')
    
    await socket.write(encoder.encode(emailContent + '\r\n'))
    const sendResponse = await readResponse()
    console.log(`<<< ${sendResponse.trim()}`)
    
    if (!sendResponse.startsWith('250')) {
      throw new Error(`Erreur envoi email: ${sendResponse}`)
    }
    
    // 9. QUIT
    await sendCommand('QUIT')
    
    return {
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}`,
      details: {
        messageId,
        server: `${config.host}:${config.port}`,
        timestamp: date
      }
    }
    
  } catch (error) {
    console.error('Erreur envoi SMTP:', error)
    
    // Analyse des erreurs SMTP spécifiques
    const errorMessage = error.message || error.toString()
    
    if (errorMessage.includes('566')) {
      return {
        success: false,
        error: 'Configuration SMTP incorrecte ou domaine non autorisé',
        details: 'Le serveur SMTP retourne une erreur 566. Vérifiez la configuration de votre domaine d\'envoi.'
      }
    }
    
    if (errorMessage.includes('535')) {
      return {
        success: false,
        error: 'Authentification SMTP échouée',
        details: 'Nom d\'utilisateur ou mot de passe incorrect.'
      }
    }
    
    if (errorMessage.includes('550')) {
      return {
        success: false,
        error: 'Adresse email rejetée',
        details: 'L\'adresse email de destination est rejetée par le serveur.'
      }
    }
    
    return {
      success: false,
      error: 'Erreur de connexion SMTP',
      details: errorMessage
    }
    
  } finally {
    if (socket) {
      try {
        socket.close()
      } catch (e) {
        console.error('Erreur fermeture socket:', e)
      }
    }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      smtp_host, 
      smtp_port, 
      smtp_username, 
      smtp_password, 
      from_email, 
      from_name,
      test_email 
    } = await req.json()

    console.log('Test SMTP avec configuration:', {
      host: smtp_host,
      port: smtp_port,
      username: smtp_username,
      from_email,
      test_email
    })

    const config: SMTPConfig = {
      host: smtp_host,
      port: parseInt(smtp_port),
      username: smtp_username,
      password: smtp_password,
      from_email,
      from_name: from_name || 'Test Sender'
    }

    const result = await sendTestEmail(config, test_email)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Erreur dans la fonction Edge:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur serveur',
        details: error.message || error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Toujours retourner 200 pour éviter l'erreur "non-2xx"
      },
    )
  }
})
