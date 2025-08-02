
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

async function testSmtpConnection(config: SMTPConfig, testEmail: string, sendRealEmail: boolean = true) {
  const startTime = Date.now()
  let socket: Deno.TcpConn | null = null
  
  try {
    console.log(`🔌 [${Date.now() - startTime}ms] Connexion SMTP à ${config.host}:${config.port}`)
    
    // Timeout étendu à 15 secondes pour la connexion (spécial Turbo SMTP)
    const connectPromise = Deno.connect({
      hostname: config.host,
      port: config.port,
    })
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de connexion (15s)')), 15000)
    })
    
    socket = await Promise.race([connectPromise, timeoutPromise])
    console.log(`✅ [${Date.now() - startTime}ms] Connexion TCP établie`)
    
    if (!sendRealEmail) {
      // Test simple de connectivité TCP
      const decoder = new TextDecoder()
      const buffer = new Uint8Array(1024)
      
      const readPromise = socket.read(buffer)
      const readTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout lecture welcome (10s)')), 10000)
      })
      
      const n = await Promise.race([readPromise, readTimeoutPromise])
      if (n === null) throw new Error("Connexion fermée par le serveur")
      
      const welcome = decoder.decode(buffer.subarray(0, n))
      console.log(`✅ [${Date.now() - startTime}ms] Test connexion rapide OK: ${welcome.trim()}`)
      
      const duration = Date.now() - startTime
      return {
        success: true,
        message: `Test de connectivité réussi (${duration}ms)`,
        details: `Serveur: ${config.host}:${config.port} | Temps: ${duration}ms | Réponse: ${welcome.trim()}`,
        responseTime: duration
      }
    }
    
    // Test complet avec envoi d'email - timeouts étendus pour Turbo SMTP
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Fonction pour lire avec timeout étendu
    const readWithTimeout = async (timeoutMs: number = 10000): Promise<string> => {
      const buffer = new Uint8Array(1024)
      const readPromise = socket!.read(buffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout lecture (${timeoutMs}ms)`)), timeoutMs)
      })
      
      const n = await Promise.race([readPromise, timeoutPromise])
      if (n === null) throw new Error("Connexion fermée")
      return decoder.decode(buffer.subarray(0, n))
    }
    
    // Fonction pour envoyer des commandes avec logging étendu
    const sendCommand = async (command: string, timeoutMs: number = 10000): Promise<string> => {
      const commandStart = Date.now()
      console.log(`📤 [${Date.now() - startTime}ms] >>> ${command}`)
      await socket!.write(encoder.encode(command + "\r\n"))
      const response = await readWithTimeout(timeoutMs)
      const commandDuration = Date.now() - commandStart
      console.log(`📥 [${Date.now() - startTime}ms] <<< ${response.trim()} (${commandDuration}ms)`)
      return response.trim()
    }
    
    // 1. Welcome message - timeout étendu car Turbo SMTP est lent
    console.log(`⏳ [${Date.now() - startTime}ms] Attente du message de bienvenue...`)
    const welcome = await readWithTimeout(15000)
    console.log(`📥 [${Date.now() - startTime}ms] Welcome: ${welcome.trim()}`)
    if (!welcome.startsWith('220')) {
      throw new Error(`Erreur welcome: ${welcome}`)
    }
    
    // 2. EHLO
    const ehlo = await sendCommand(`EHLO ${config.from_email.split('@')[1]}`, 10000)
    if (!ehlo.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehlo}`)
    }
    
    // 3. STARTTLS si port 587 ou si disponible
    if (config.port === 587 || ehlo.includes('STARTTLS')) {
      console.log(`🔐 [${Date.now() - startTime}ms] Démarrage TLS...`)
      const tls = await sendCommand('STARTTLS', 10000)
      if (tls.startsWith('220')) {
        socket = await Deno.startTls(socket, { hostname: config.host })
        console.log(`✅ [${Date.now() - startTime}ms] TLS activé`)
        await sendCommand(`EHLO ${config.from_email.split('@')[1]}`, 10000)
      }
    } else if (config.port === 465) {
      // Port 465 = SSL direct, pas de STARTTLS
      console.log(`🔐 [${Date.now() - startTime}ms] Connexion SSL directe sur port 465`)
    }
    
    // 4. Authentification - AUTH PLAIN avec timeout étendu
    console.log(`🔑 [${Date.now() - startTime}ms] Authentification...`)
    const authPlain = await sendCommand('AUTH PLAIN', 10000)
    if (authPlain.startsWith('334')) {
      const authString = `\0${config.username}\0${config.password}`
      const authB64 = btoa(authString)
      const authResult = await sendCommand(authB64, 15000)
      if (!authResult.startsWith('235')) {
        throw new Error(`Authentification échouée: ${authResult}`)
      }
    } else {
      throw new Error(`AUTH PLAIN non supporté: ${authPlain}`)
    }
    
    console.log(`✅ [${Date.now() - startTime}ms] Authentification réussie`)
    
    // 5. Test d'envoi rapide avec timeouts étendus
    console.log(`📧 [${Date.now() - startTime}ms] Début envoi email de test...`)
    await sendCommand(`MAIL FROM:<${config.from_email}>`, 10000)
    await sendCommand(`RCPT TO:<${testEmail}>`, 10000)
    await sendCommand('DATA', 10000)
    
    const emailContent = [
      `From: ${config.from_name} <${config.from_email}>`,
      `To: ${testEmail}`,
      `Subject: Test SMTP - ${new Date().toLocaleString('fr-FR')}`,
      `Date: ${new Date().toISOString()}`,
      ``,
      `Test SMTP réussi depuis ${config.host}:${config.port}`,
      `Serveur: Turbo SMTP`,
      `Durée totale: ${Date.now() - startTime}ms`,
      `Timestamp: ${new Date().toISOString()}`,
      `.`
    ].join('\r\n') + '\r\n'
    
    await socket.write(encoder.encode(emailContent))
    const sendResult = await readWithTimeout(20000) // 20s pour l'envoi final
    
    if (!sendResult.startsWith('250')) {
      throw new Error(`Erreur envoi: ${sendResult}`)
    }
    
    await sendCommand('QUIT', 5000)
    
    const duration = Date.now() - startTime
    console.log(`✅ [${duration}ms] Email envoyé avec succès`)
    
    return {
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}`,
      details: `Durée totale: ${duration}ms | Serveur: ${config.host}:${config.port} | Type: ${config.port === 465 ? 'SSL' : config.port === 587 ? 'STARTTLS' : 'SMTP'}`,
      responseTime: duration
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [${duration}ms] Erreur SMTP:`, error.message)
    
    // Analyse spécifique des erreurs pour Turbo SMTP
    let errorType = 'Erreur de connexion SMTP'
    let suggestions = []
    
    if (error.message.includes('Timeout')) {
      errorType = 'Timeout de connexion SMTP'
      suggestions.push('Le serveur Turbo SMTP est lent, ceci est normal')
      suggestions.push('Essayez le port 587 (STARTTLS) au lieu du port 465 (SSL)')
      suggestions.push('Vérifiez que pro.eu.turbo-smtp.com est accessible')
    }
    
    return {
      success: false,
      error: errorType,
      details: `${error.message} (${duration}ms)`,
      responseTime: duration,
      suggestions: suggestions.length > 0 ? suggestions : undefined
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
  console.log(`🚀 Début traitement requête ${req.method}`)
  
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
      send_real_email = true
    } = await req.json()

    console.log('📋 Configuration reçue:', {
      host: smtp_host,
      port: smtp_port,
      username: smtp_username,
      from_email,
      test_email,
      send_real_email
    })

    if (!smtp_host || !smtp_port || !smtp_username || !smtp_password || !from_email || !test_email) {
      throw new Error('Paramètres manquants')
    }

    const config: SMTPConfig = {
      host: smtp_host,
      port: parseInt(smtp_port.toString()),
      username: smtp_username,
      password: smtp_password,
      from_email,
      from_name: from_name || 'Test Sender'
    }

    const result = await testSmtpConnection(config, test_email, send_real_email)
    
    console.log('✅ Résultat final:', result)

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('💥 Erreur dans la fonction Edge:', error)
    
    const errorResult = {
      success: false,
      error: 'Erreur serveur',
      details: error.message,
      responseTime: 0
    }
    
    return new Response(
      JSON.stringify(errorResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  }
})
