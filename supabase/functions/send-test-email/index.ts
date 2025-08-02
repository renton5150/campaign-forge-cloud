
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
    
    // Timeout strict de 10 secondes pour la connexion
    const connectPromise = Deno.connect({
      hostname: config.host,
      port: config.port,
    })
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de connexion (10s)')), 10000)
    })
    
    socket = await Promise.race([connectPromise, timeoutPromise])
    
    if (!sendRealEmail) {
      // Test simple de connectivité
      const decoder = new TextDecoder()
      const buffer = new Uint8Array(1024)
      
      const readPromise = socket.read(buffer)
      const readTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout lecture welcome (5s)')), 5000)
      })
      
      const n = await Promise.race([readPromise, readTimeoutPromise])
      if (n === null) throw new Error("Connexion fermée par le serveur")
      
      const welcome = decoder.decode(buffer.subarray(0, n))
      console.log(`✅ [${Date.now() - startTime}ms] Test connexion OK: ${welcome.trim()}`)
      
      return {
        success: true,
        message: 'Test de connexion réussi - Serveur SMTP accessible',
        details: `Serveur: ${config.host}:${config.port} | Réponse: ${welcome.trim()}`
      }
    }
    
    // Test complet avec envoi d'email
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Fonction pour lire avec timeout
    const readWithTimeout = async (timeoutMs: number = 5000): Promise<string> => {
      const buffer = new Uint8Array(1024)
      const readPromise = socket!.read(buffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout lecture (${timeoutMs}ms)`)), timeoutMs)
      })
      
      const n = await Promise.race([readPromise, timeoutPromise])
      if (n === null) throw new Error("Connexion fermée")
      return decoder.decode(buffer.subarray(0, n))
    }
    
    // Fonction pour envoyer des commandes
    const sendCommand = async (command: string): Promise<string> => {
      console.log(`📤 [${Date.now() - startTime}ms] >>> ${command}`)
      await socket!.write(encoder.encode(command + "\r\n"))
      const response = await readWithTimeout(5000)
      console.log(`📥 [${Date.now() - startTime}ms] <<< ${response.trim()}`)
      return response.trim()
    }
    
    // 1. Welcome message
    const welcome = await readWithTimeout(5000)
    console.log(`📥 [${Date.now() - startTime}ms] Welcome: ${welcome.trim()}`)
    if (!welcome.startsWith('220')) {
      throw new Error(`Erreur welcome: ${welcome}`)
    }
    
    // 2. EHLO
    const ehlo = await sendCommand(`EHLO ${config.from_email.split('@')[1]}`)
    if (!ehlo.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehlo}`)
    }
    
    // 3. STARTTLS si disponible
    if (ehlo.includes('STARTTLS')) {
      const tls = await sendCommand('STARTTLS')
      if (tls.startsWith('220')) {
        socket = await Deno.startTls(socket, { hostname: config.host })
        await sendCommand(`EHLO ${config.from_email.split('@')[1]}`)
      }
    }
    
    // 4. Authentification - AUTH PLAIN
    const authPlain = await sendCommand('AUTH PLAIN')
    if (authPlain.startsWith('334')) {
      const authString = `\0${config.username}\0${config.password}`
      const authB64 = btoa(authString)
      const authResult = await sendCommand(authB64)
      if (!authResult.startsWith('235')) {
        throw new Error(`Authentification échouée: ${authResult}`)
      }
    } else {
      throw new Error(`AUTH PLAIN non supporté: ${authPlain}`)
    }
    
    console.log(`✅ [${Date.now() - startTime}ms] Authentification réussie`)
    
    // 5. Test d'envoi rapide
    await sendCommand(`MAIL FROM:<${config.from_email}>`)
    await sendCommand(`RCPT TO:<${testEmail}>`)
    await sendCommand('DATA')
    
    const emailContent = [
      `From: ${config.from_name} <${config.from_email}>`,
      `To: ${testEmail}`,
      `Subject: Test SMTP - ${new Date().toLocaleString()}`,
      ``,
      `Test SMTP réussi depuis ${config.host}:${config.port}`,
      `Date: ${new Date().toISOString()}`,
      `.`
    ].join('\r\n') + '\r\n'
    
    await socket.write(encoder.encode(emailContent))
    const sendResult = await readWithTimeout(10000)
    
    if (!sendResult.startsWith('250')) {
      throw new Error(`Erreur envoi: ${sendResult}`)
    }
    
    await sendCommand('QUIT')
    
    const duration = Date.now() - startTime
    console.log(`✅ [${duration}ms] Email envoyé avec succès`)
    
    return {
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail}`,
      details: `Durée: ${duration}ms | Serveur: ${config.host}:${config.port}`
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [${duration}ms] Erreur SMTP:`, error.message)
    
    return {
      success: false,
      error: error.message.includes('Timeout') ? 'Timeout de connexion SMTP' : 'Erreur de connexion SMTP',
      details: `${error.message} (${duration}ms)`
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
      details: error.message
    }
    
    return new Response(
      JSON.stringify(errorResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Toujours 200 pour que le client puisse parser la réponse
      }
    )
  }
})
