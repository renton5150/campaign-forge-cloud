
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

async function sendTestEmail(config: SMTPConfig, testEmail: string, sendRealEmail: boolean = true) {
  let socket: Deno.TcpConn | null = null
  const startTime = Date.now()
  
  try {
    console.log(`🔌 [${Date.now() - startTime}ms] Connexion SMTP à ${config.host}:${config.port}`)
    
    // Si ce n'est pas un envoi réel, faire juste un test de connexion simple
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
      
      console.log(`✅ [${Date.now() - startTime}ms] Test de connexion réussi: ${welcome.trim()}`)
      
      return {
        success: true,
        message: 'Test de connexion réussi - Serveur SMTP accessible',
        details: {
          server: `${config.host}:${config.port}`,
          response: welcome.trim(),
          duration_ms: Date.now() - startTime
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
    
    // Fonction pour lire les réponses SMTP avec timeout
    const readResponse = async (timeoutMs: number = 10000): Promise<string> => {
      const buffer = new Uint8Array(1024)
      
      const readPromise = socket!.read(buffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout de lecture SMTP (${timeoutMs}ms)`)), timeoutMs)
      })
      
      const n = await Promise.race([readPromise, timeoutPromise])
      if (n === null) throw new Error("Connexion fermée par le serveur")
      return decoder.decode(buffer.subarray(0, n))
    }
    
    // Fonction pour envoyer des commandes SMTP avec timeout
    const sendCommand = async (command: string, timeoutMs: number = 10000): Promise<string> => {
      console.log(`📤 [${Date.now() - startTime}ms] >>> ${command}`)
      await socket!.write(encoder.encode(command + "\r\n"))
      const response = await readResponse(timeoutMs)
      console.log(`📥 [${Date.now() - startTime}ms] <<< ${response.trim()}`)
      return response.trim()
    }
    
    // 1. Lire le message de bienvenue
    const welcome = await readResponse(5000)
    console.log(`📥 [${Date.now() - startTime}ms] <<< ${welcome.trim()}`)
    
    if (!welcome.startsWith('220')) {
      throw new Error(`Erreur de connexion SMTP: ${welcome}`)
    }
    
    // 2. EHLO
    const domain = config.from_email.split('@')[1] || config.host
    const ehloResponse = await sendCommand(`EHLO ${domain}`, 5000)
    if (!ehloResponse.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehloResponse}`)
    }
    
    // 3. STARTTLS si supporté
    if (ehloResponse.includes('STARTTLS')) {
      const tlsResponse = await sendCommand('STARTTLS', 5000)
      if (!tlsResponse.startsWith('220')) {
        throw new Error(`Erreur STARTTLS: ${tlsResponse}`)
      }
      
      // Upgrade vers TLS
      socket = await Deno.startTls(socket, { hostname: config.host })
      
      // Nouveau EHLO après TLS
      const ehloTlsResponse = await sendCommand(`EHLO ${domain}`, 5000)
      if (!ehloTlsResponse.startsWith('250')) {
        throw new Error(`Erreur EHLO après TLS: ${ehloTlsResponse}`)
      }
    }
    
    // 4. Authentification AUTH PLAIN ou LOGIN
    console.log(`🔐 [${Date.now() - startTime}ms] Début de l'authentification...`)
    
    let authSuccess = false
    
    // Tenter AUTH PLAIN d'abord
    try {
      const authResponse = await sendCommand('AUTH PLAIN', 3000)
      if (authResponse.startsWith('334')) {
        const authString = `\0${config.username}\0${config.password}`
        const authB64 = btoa(authString)
        const finalResponse = await sendCommand(authB64, 5000)
        authSuccess = finalResponse.startsWith('235')
      }
    } catch (e) {
      console.log(`⚠️ AUTH PLAIN échoué: ${e.message}`)
    }
    
    // Si AUTH PLAIN échoue, tenter AUTH LOGIN
    if (!authSuccess) {
      try {
        const authResponse = await sendCommand('AUTH LOGIN', 3000)
        if (authResponse.startsWith('334')) {
          const usernameB64 = btoa(config.username)
          const userResponse = await sendCommand(usernameB64, 3000)
          if (userResponse.startsWith('334')) {
            const passwordB64 = btoa(config.password)
            const passResponse = await sendCommand(passwordB64, 5000)
            authSuccess = passResponse.startsWith('235')
          }
        }
      } catch (e) {
        console.log(`⚠️ AUTH LOGIN échoué: ${e.message}`)
      }
    }
    
    if (!authSuccess) {
      throw new Error('Authentification échouée avec toutes les méthodes disponibles')
    }
    
    console.log(`✅ [${Date.now() - startTime}ms] Authentification réussie!`)
    
    // 5. MAIL FROM
    const mailFromResponse = await sendCommand(`MAIL FROM:<${config.from_email}>`, 3000)
    if (!mailFromResponse.startsWith('250')) {
      throw new Error(`Erreur MAIL FROM: ${mailFromResponse}`)
    }
    
    // 6. RCPT TO
    const rcptToResponse = await sendCommand(`RCPT TO:<${testEmail}>`, 3000)
    if (!rcptToResponse.startsWith('250')) {
      throw new Error(`Erreur RCPT TO: ${rcptToResponse}`)
    }
    
    // 7. DATA
    const dataResponse = await sendCommand('DATA', 3000)
    if (!dataResponse.startsWith('354')) {
      throw new Error(`Erreur DATA: ${dataResponse}`)
    }
    
    // 8. Contenu de l'email simplifié
    const messageId = `<test-${Date.now()}@${domain}>`
    const date = new Date().toUTCString()
    const testSubject = `Test SMTP - ${config.from_name}`
    
    const emailContent = [
      `Message-ID: ${messageId}`,
      `Date: ${date}`,
      `From: ${config.from_name} <${config.from_email}>`,
      `To: ${testEmail}`,
      `Subject: ${testSubject}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      `Test SMTP réussi !`,
      ``,
      `Ce message confirme que votre serveur SMTP ${config.host}:${config.port} fonctionne correctement.`,
      ``,
      `Configuration testée :`,
      `- Serveur : ${config.host}:${config.port}`,
      `- Utilisateur : ${config.username}`,
      `- Expéditeur : ${config.from_email}`,
      `- Date du test : ${date}`,
      ``,
      `Cordialement,`,
      `${config.from_name}`,
      `.`
    ].join('\r\n') + '\r\n'
    
    await socket.write(encoder.encode(emailContent))
    const sendResponse = await readResponse(10000)
    console.log(`📥 [${Date.now() - startTime}ms] <<< ${sendResponse.trim()}`)
    
    if (!sendResponse.startsWith('250')) {
      throw new Error(`Erreur envoi email: ${sendResponse}`)
    }
    
    // 9. QUIT
    await sendCommand('QUIT', 3000)
    
    const duration = Date.now() - startTime
    console.log(`✅ [${duration}ms] Email de test envoyé avec succès`)
    
    return {
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}`,
      details: {
        messageId,
        server: `${config.host}:${config.port}`,
        timestamp: date,
        from: config.from_email,
        to: testEmail,
        duration_ms: duration
      }
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [${duration}ms] Erreur envoi SMTP:`, error.message)
    
    // Analyse des erreurs SMTP spécifiques
    const errorMessage = error.message || error.toString()
    
    if (errorMessage.includes('566')) {
      return {
        success: false,
        error: 'Limite SMTP dépassée',
        details: `Le serveur SMTP a retourné une erreur 566. Attendez quelques minutes avant de retenter.`
      }
    }
    
    if (errorMessage.includes('535')) {
      return {
        success: false,
        error: 'Authentification SMTP échouée',
        details: 'Nom d\'utilisateur ou mot de passe incorrect.'
      }
    }
    
    if (errorMessage.includes('Timeout')) {
      return {
        success: false,
        error: 'Timeout de connexion SMTP',
        details: `Le serveur met trop de temps à répondre (${duration}ms). Vérifiez la connectivité.`
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
  const startTime = Date.now()
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`🚀 [${Date.now() - startTime}ms] Début du traitement de la requête`)
    
    const { 
      smtp_host, 
      smtp_port, 
      smtp_username, 
      smtp_password, 
      from_email, 
      from_name,
      test_email,
      send_real_email = true
    } = await req.json()

    console.log(`📋 [${Date.now() - startTime}ms] Configuration reçue:`, {
      host: smtp_host,
      port: smtp_port,
      username: smtp_username,
      from_email,
      test_email,
      send_real_email
    })

    const config: SMTPConfig = {
      host: smtp_host,
      port: parseInt(smtp_port),
      username: smtp_username,
      password: smtp_password,
      from_email,
      from_name: from_name || 'Test Sender'
    }

    const result = await sendTestEmail(config, test_email, send_real_email)
    
    console.log(`✅ [${Date.now() - startTime}ms] Résultat final:`, result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`💥 [${duration}ms] Erreur dans la fonction Edge:`, error)
    
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
