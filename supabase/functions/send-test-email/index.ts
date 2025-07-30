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

// Validation pour serveurs 7tic/OVH
function validateSmtpConfig(config: SMTPConfig): { valid: boolean; error?: string } {
  // Validation spécifique pour 7tic/OVH
  if (config.host.includes('ovh.net') || config.host.includes('7tic')) {
    // Pour 7tic/OVH, l'email d'expédition doit correspondre au compte configuré
    if (!config.from_email || !config.from_email.includes('@')) {
      return {
        valid: false,
        error: 'Adresse email d\'expédition invalide pour le serveur 7tic/OVH'
      }
    }
    
    // Vérifier que username et from_email correspondent (cas courant avec 7tic)
    if (config.username !== config.from_email) {
      console.log(`Attention: Username (${config.username}) diffère de from_email (${config.from_email}) sur serveur 7tic/OVH`)
    }
  }
  
  return { valid: true }
}

// Fonction pour l'authentification PLAIN
async function authPlain(socket: Deno.TcpConn, encoder: TextEncoder, decoder: TextDecoder, username: string, password: string): Promise<boolean> {
  const sendCommand = async (command: string): Promise<string> => {
    console.log(`>>> ${command}`)
    await socket.write(encoder.encode(command + "\r\n"))
    const buffer = new Uint8Array(1024)
    const n = await socket.read(buffer)
    if (n === null) throw new Error("Connexion fermée par le serveur")
    const response = decoder.decode(buffer.subarray(0, n)).trim()
    console.log(`<<< ${response}`)
    return response
  }

  try {
    const authResponse = await sendCommand('AUTH PLAIN')
    if (!authResponse.startsWith('334')) {
      return false
    }
    
    // Créer la chaîne d'authentification PLAIN: \0username\0password
    const authString = `\0${username}\0${password}`
    const authB64 = btoa(authString)
    
    const finalResponse = await sendCommand(authB64)
    return finalResponse.startsWith('235')
  } catch (error) {
    console.error('Erreur AUTH PLAIN:', error)
    return false
  }
}

// Fonction pour l'authentification LOGIN
async function authLogin(socket: Deno.TcpConn, encoder: TextEncoder, decoder: TextDecoder, username: string, password: string): Promise<boolean> {
  const sendCommand = async (command: string): Promise<string> => {
    console.log(`>>> ${command}`)
    await socket.write(encoder.encode(command + "\r\n"))
    const buffer = new Uint8Array(1024)
    const n = await socket.read(buffer)
    if (n === null) throw new Error("Connexion fermée par le serveur")
    const response = decoder.decode(buffer.subarray(0, n)).trim()
    console.log(`<<< ${response}`)
    return response
  }

  try {
    const authResponse = await sendCommand('AUTH LOGIN')
    if (!authResponse.startsWith('334')) {
      return false
    }
    
    // Encoder username en base64
    const usernameB64 = btoa(username)
    const userResponse = await sendCommand(usernameB64)
    if (!userResponse.startsWith('334')) {
      return false
    }
    
    // Encoder password en base64
    const passwordB64 = btoa(password)
    const passResponse = await sendCommand(passwordB64)
    return passResponse.startsWith('235')
  } catch (error) {
    console.error('Erreur AUTH LOGIN:', error)
    return false
  }
}

async function sendTestEmail(config: SMTPConfig, testEmail: string, sendRealEmail: boolean = true, htmlContent?: string, subject?: string) {
  let socket: Deno.TcpConn | null = null
  
  try {
    // Validation de la configuration
    const validation = validateSmtpConfig(config)
    if (!validation.valid) {
      return {
        success: false,
        error: 'Configuration SMTP invalide',
        details: validation.error
      }
    }
    
    console.log(`Connexion SMTP à ${config.host}:${config.port}`)
    
    // Si ce n'est pas un envoi réel, faire juste un test de connexion
    if (!sendRealEmail) {
      socket = await Deno.connect({
        hostname: config.host,
        port: config.port,
      })
      
      const decoder = new TextDecoder()
      const buffer = new Uint8Array(1024)
      const n = await socket.read(buffer)
      if (n === null) throw new Error("Connexion fermée par le serveur")
      const welcome = decoder.decode(buffer.subarray(0, n))
      
      if (!welcome.startsWith('220')) {
        throw new Error(`Erreur de connexion SMTP: ${welcome}`)
      }
      
      return {
        success: true,
        message: 'Test de connexion réussi - Serveur SMTP accessible',
        details: {
          server: `${config.host}:${config.port}`,
          response: welcome.trim(),
          type: 'connection_test'
        }
      }
    }
    
    // Connexion au serveur SMTP pour envoi réel
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
    
    // 2. EHLO avec nom de domaine correct
    const domain = config.from_email.split('@')[1] || config.host
    const ehloResponse = await sendCommand(`EHLO ${domain}`)
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
      const ehloTlsResponse = await sendCommand(`EHLO ${domain}`)
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(`Erreur EHLO après TLS: ${ehloTlsResponse}`)
      }
    }
    
    // 4. Authentification avec méthodes multiples
    console.log('Début de l\'authentification...')
    let authSuccess = false
    
    // Tenter AUTH PLAIN d'abord pour les serveurs OVH/7tic
    if (config.host.includes('ovh.net') || config.host.includes('7tic')) {
      console.log('Tentative AUTH PLAIN pour serveur OVH/7tic...')
      authSuccess = await authPlain(socket, encoder, decoder, config.username, config.password)
    }
    
    // Si AUTH PLAIN échoue ou n'est pas utilisé, tenter AUTH LOGIN
    if (!authSuccess) {
      console.log('Tentative AUTH LOGIN...')
      authSuccess = await authLogin(socket, encoder, decoder, config.username, config.password)
    }
    
    if (!authSuccess) {
      throw new Error('Authentification échouée avec toutes les méthodes disponibles')
    }
    
    console.log('Authentification réussie!')
    
    // 5. MAIL FROM avec Return-Path
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
    
    // 8. Contenu de l'email
    const messageId = `<test-${Date.now()}@${domain}>`
    const date = new Date().toUTCString()
    
    let emailContent: string[]
    
    if (htmlContent && subject) {
      // Email avec le template de la campagne
      emailContent = [
        `Return-Path: <${config.from_email}>`,
        `Message-ID: ${messageId}`,
        `Date: ${date}`,
        `From: ${config.from_name} <${config.from_email}>`,
        `To: ${testEmail}`,
        `Reply-To: ${config.from_email}`,
        `Subject: =?UTF-8?B?${btoa(subject)}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 8bit`,
        `X-Mailer: Campaign Test Client`,
        `X-Priority: 3`,
        ``,
        htmlContent,
        ``,
        `.`
      ]
    } else {
      // Email de test par défaut
      const testSubject = sendRealEmail 
        ? `Test SMTP - ${config.from_name}`
        : 'Test de connexion SMTP'
      
      emailContent = [
        `Return-Path: <${config.from_email}>`,
        `Message-ID: ${messageId}`,
        `Date: ${date}`,
        `From: ${config.from_name} <${config.from_email}>`,
        `To: ${testEmail}`,
        `Reply-To: ${config.from_email}`,
        `Subject: =?UTF-8?B?${btoa(testSubject)}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        `Content-Transfer-Encoding: 8bit`,
        `X-Mailer: SMTP Test Client`,
        `X-Priority: 3`,
        ``,
        `<!DOCTYPE html>`,
        `<html>`,
        `<head><meta charset="UTF-8"></head>`,
        `<body>`,
        `<h2>✅ Test SMTP réussi !</h2>`,
        `<p>Félicitations ! Votre serveur SMTP <strong>${config.host}</strong> fonctionne correctement.</p>`,
        `<hr>`,
        `<h3>Configuration testée :</h3>`,
        `<ul>`,
        `<li><strong>Serveur :</strong> ${config.host}:${config.port}</li>`,
        `<li><strong>Utilisateur :</strong> ${config.username}</li>`,
        `<li><strong>Expéditeur :</strong> ${config.from_email}</li>`,
        `<li><strong>Date du test :</strong> ${date}</li>`,
        `</ul>`,
        `<p><em>Si vous recevez cet email, votre configuration SMTP est opérationnelle.</em></p>`,
        `<p>Cordialement,<br><strong>${config.from_name}</strong></p>`,
        `</body>`,
        `</html>`,
        `.`
      ]
    }
    
    await socket.write(encoder.encode(emailContent.join('\r\n') + '\r\n'))
    const sendResponse = await readResponse()
    console.log(`<<< ${sendResponse.trim()}`)
    
    if (!sendResponse.startsWith('250')) {
      throw new Error(`Erreur envoi email: ${sendResponse}`)
    }
    
    // 9. QUIT
    await sendCommand('QUIT')
    
    const successMessage = sendRealEmail
      ? `Email de test envoyé avec succès à ${testEmail}`
      : `Test de connexion réussi`
    
    return {
      success: true,
      message: successMessage,
      details: {
        messageId,
        server: `${config.host}:${config.port}`,
        timestamp: date,
        from: config.from_email,
        to: testEmail,
        type: sendRealEmail ? 'real_email' : 'connection_test'
      }
    }
    
  } catch (error) {
    console.error('Erreur envoi SMTP:', error)
    
    // Analyse des erreurs SMTP spécifiques
    const errorMessage = error.message || error.toString()
    
    if (errorMessage.includes('566')) {
      return {
        success: false,
        error: 'Limite SMTP dépassée',
        details: `Le serveur SMTP ${config.host} a retourné une erreur 566 (limite dépassée). Veuillez attendre quelques minutes avant de retenter le test. Cette erreur est courante avec les serveurs qui limitent le nombre d'emails par minute.`
      }
    }
    
    if (errorMessage.includes('535')) {
      return {
        success: false,
        error: 'Authentification SMTP échouée',
        details: 'Nom d\'utilisateur ou mot de passe incorrect. Vérifiez vos identifiants SMTP.'
      }
    }
    
    if (errorMessage.includes('550')) {
      return {
        success: false,
        error: 'Adresse email rejetée',
        details: 'L\'adresse email de destination est rejetée par le serveur. Vérifiez l\'adresse email ou les restrictions du serveur.'
      }
    }
    
    if (errorMessage.includes('554')) {
      return {
        success: false,
        error: 'Email rejeté par le serveur',
        details: 'Le serveur SMTP a rejeté l\'email. Cela peut être dû à des restrictions anti-spam ou à un contenu non autorisé.'
      }
    }
    
    if (errorMessage.includes('Authentification échouée')) {
      return {
        success: false,
        error: 'Authentification impossible',
        details: 'Impossible de s\'authentifier avec les méthodes AUTH PLAIN et AUTH LOGIN. Vérifiez vos identifiants et la configuration du serveur.'
      }
    }
    
    if (errorMessage.includes('STARTTLS')) {
      return {
        success: false,
        error: 'Erreur de chiffrement TLS',
        details: 'Impossible d\'établir une connexion TLS sécurisée. Vérifiez la configuration du port et du chiffrement.'
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
      test_email,
      send_real_email = true,
      html_content,
      subject
    } = await req.json()

    console.log('Test SMTP avec configuration:', {
      host: smtp_host,
      port: smtp_port,
      username: smtp_username,
      from_email,
      test_email,
      send_real_email,
      has_html_content: !!html_content,
      has_subject: !!subject
    })

    const config: SMTPConfig = {
      host: smtp_host,
      port: parseInt(smtp_port),
      username: smtp_username,
      password: smtp_password,
      from_email,
      from_name: from_name || 'Test Sender'
    }

    const result = await sendTestEmail(config, test_email, send_real_email, html_content, subject)

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
        status: 200,
      },
    )
  }
})
