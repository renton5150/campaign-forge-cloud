
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

// Fonction pour détecter le type de serveur SMTP et adapter les paramètres
function getServerConfig(host: string, port: number) {
  const hostLower = host.toLowerCase();
  
  // Configuration spécifique par serveur
  const serverConfigs = {
    turboSmtp: {
      detect: (h: string) => h.includes('turbo-smtp.com'),
      name: 'Turbo SMTP',
      connectTimeout: 15000,
      readTimeout: 15000,
      sendTimeout: 20000,
      isKnownSlow: true,
      suggestions: [
        'Le serveur Turbo SMTP est connu pour être lent, ceci est normal',
        'Essayez le port 587 (STARTTLS) au lieu du port 465 (SSL)',
        'Vérifiez que pro.eu.turbo-smtp.com est accessible'
      ]
    },
    ovh7tic: {
      detect: (h: string) => h.includes('ovh.net') || h.includes('7tic'),
      name: '7TIC/OVH',
      connectTimeout: 10000,
      readTimeout: 8000,
      sendTimeout: 15000,
      isKnownSlow: false,
      suggestions: [
        'Pour OVH/7tic, utilisez votre adresse email complète comme nom d\'utilisateur',
        'Vérifiez les paramètres de sécurité de votre compte OVH',
        'Port 465 (SSL) ou 587 (STARTTLS) sont recommandés'
      ]
    },
    gmail: {
      detect: (h: string) => h.includes('gmail.com') || h.includes('google.com'),
      name: 'Gmail SMTP',
      connectTimeout: 8000,
      readTimeout: 8000,
      sendTimeout: 12000,
      isKnownSlow: false,
      suggestions: [
        'Pour Gmail, utilisez un mot de passe d\'application, pas votre mot de passe principal',
        'Activez l\'authentification à 2 facteurs et générez un mot de passe d\'app',
        'Utilisez le port 587 avec STARTTLS'
      ]
    },
    outlook: {
      detect: (h: string) => h.includes('outlook') || h.includes('live.com') || h.includes('hotmail'),
      name: 'Outlook/Hotmail',
      connectTimeout: 8000,
      readTimeout: 8000,
      sendTimeout: 12000,
      isKnownSlow: false,
      suggestions: [
        'Pour Outlook, utilisez l\'authentification moderne OAuth2 si possible',
        'Vérifiez les paramètres de sécurité de votre compte Microsoft',
        'Port 587 avec STARTTLS est recommandé'
      ]
    },
    generic: {
      detect: () => true, // fallback
      name: 'SMTP Générique',
      connectTimeout: 10000,
      readTimeout: 10000,
      sendTimeout: 15000,
      isKnownSlow: false,
      suggestions: [
        'Vérifiez les paramètres SMTP auprès de votre fournisseur',
        'Assurez-vous que les ports et protocoles de chiffrement sont corrects',
        'Contactez votre administrateur système si le problème persiste'
      ]
    }
  };

  // Détecter le type de serveur
  for (const [key, config] of Object.entries(serverConfigs)) {
    if (key !== 'generic' && config.detect(hostLower)) {
      return config;
    }
  }
  
  return serverConfigs.generic;
}

// Fonction pour générer des suggestions d'erreur spécifiques
function getErrorSuggestions(error: Error, serverConfig: any, host: string, port: number): string[] {
  const errorMsg = error.message.toLowerCase();
  
  // Suggestions spécifiques par type d'erreur
  if (errorMsg.includes('timeout') || errorMsg.includes('connexion')) {
    return [
      `Problème de connectivité avec ${serverConfig.name}`,
      `Vérifiez que ${host}:${port} est accessible depuis votre réseau`,
      'Contrôlez les paramètres de firewall',
      ...serverConfig.suggestions
    ];
  }
  
  if (errorMsg.includes('auth') || errorMsg.includes('535')) {
    return [
      `Erreur d'authentification sur ${serverConfig.name}`,
      'Vérifiez votre nom d\'utilisateur et mot de passe',
      ...serverConfig.suggestions
    ];
  }
  
  if (errorMsg.includes('550') || errorMsg.includes('address')) {
    return [
      'Adresse email rejetée par le serveur',
      'Vérifiez l\'adresse email de destination',
      `Consultez les restrictions de ${serverConfig.name}`,
      ...serverConfig.suggestions
    ];
  }
  
  // Suggestions génériques + suggestions spécifiques au serveur
  return [
    `Erreur avec le serveur ${serverConfig.name}`,
    'Vérifiez la configuration SMTP',
    ...serverConfig.suggestions
  ];
}

async function testSmtpConnection(config: SMTPConfig, testEmail: string, sendRealEmail: boolean = true) {
  const startTime = Date.now()
  let socket: Deno.TcpConn | null = null
  
  // Détecter le type de serveur et adapter la configuration
  const serverConfig = getServerConfig(config.host, config.port);
  
  try {
    console.log(`🔌 [${Date.now() - startTime}ms] Connexion ${serverConfig.name} à ${config.host}:${config.port}`)
    
    // Utiliser les timeouts spécifiques au serveur
    const connectPromise = Deno.connect({
      hostname: config.host,
      port: config.port,
    })
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout de connexion (${serverConfig.connectTimeout}ms)`)), serverConfig.connectTimeout)
    })
    
    socket = await Promise.race([connectPromise, timeoutPromise])
    console.log(`✅ [${Date.now() - startTime}ms] Connexion TCP établie avec ${serverConfig.name}`)
    
    if (!sendRealEmail) {
      // Test simple de connectivité TCP
      const decoder = new TextDecoder()
      const buffer = new Uint8Array(1024)
      
      const readPromise = socket.read(buffer)
      const readTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout lecture welcome (${serverConfig.readTimeout}ms)`)), serverConfig.readTimeout)
      })
      
      const n = await Promise.race([readPromise, readTimeoutPromise])
      if (n === null) throw new Error("Connexion fermée par le serveur")
      
      const welcome = decoder.decode(buffer.subarray(0, n))
      console.log(`✅ [${Date.now() - startTime}ms] Test connexion rapide OK avec ${serverConfig.name}: ${welcome.trim()}`)
      
      const duration = Date.now() - startTime
      return {
        success: true,
        message: `Test de connectivité réussi avec ${serverConfig.name} (${duration}ms)`,
        details: `Serveur: ${config.host}:${config.port} | Type: ${serverConfig.name} | Temps: ${duration}ms | Réponse: ${welcome.trim()}`,
        responseTime: duration
      }
    }
    
    // Test complet avec envoi d'email - utiliser les timeouts spécifiques
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    // Fonction pour lire avec timeout adapté au serveur
    const readWithTimeout = async (timeoutMs: number = serverConfig.readTimeout): Promise<string> => {
      const buffer = new Uint8Array(1024)
      const readPromise = socket!.read(buffer)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout lecture (${timeoutMs}ms)`)), timeoutMs)
      })
      
      const n = await Promise.race([readPromise, timeoutPromise])
      if (n === null) throw new Error("Connexion fermée")
      return decoder.decode(buffer.subarray(0, n))
    }
    
    // Fonction pour envoyer des commandes avec logging adapté
    const sendCommand = async (command: string, timeoutMs: number = serverConfig.readTimeout): Promise<string> => {
      const commandStart = Date.now()
      console.log(`📤 [${Date.now() - startTime}ms] >>> ${command}`)
      await socket!.write(encoder.encode(command + "\r\n"))
      const response = await readWithTimeout(timeoutMs)
      const commandDuration = Date.now() - commandStart
      console.log(`📥 [${Date.now() - startTime}ms] <<< ${response.trim()} (${commandDuration}ms)`)
      return response.trim()
    }
    
    // 1. Welcome message - timeout adapté au serveur
    console.log(`⏳ [${Date.now() - startTime}ms] Attente du message de bienvenue de ${serverConfig.name}...`)
    const welcome = await readWithTimeout(serverConfig.connectTimeout)
    console.log(`📥 [${Date.now() - startTime}ms] Welcome: ${welcome.trim()}`)
    if (!welcome.startsWith('220')) {
      throw new Error(`Erreur welcome: ${welcome}`)
    }
    
    // 2. EHLO
    const ehlo = await sendCommand(`EHLO ${config.from_email.split('@')[1]}`)
    if (!ehlo.startsWith('250')) {
      throw new Error(`Erreur EHLO: ${ehlo}`)
    }
    
    // 3. STARTTLS si port 587 ou si disponible
    if (config.port === 587 || ehlo.includes('STARTTLS')) {
      console.log(`🔐 [${Date.now() - startTime}ms] Démarrage TLS sur ${serverConfig.name}...`)
      const tls = await sendCommand('STARTTLS')
      if (tls.startsWith('220')) {
        socket = await Deno.startTls(socket, { hostname: config.host })
        console.log(`✅ [${Date.now() - startTime}ms] TLS activé`)
        await sendCommand(`EHLO ${config.from_email.split('@')[1]}`)
      }
    } else if (config.port === 465) {
      console.log(`🔐 [${Date.now() - startTime}ms] Connexion SSL directe sur port 465 (${serverConfig.name})`)
    }
    
    // 4. Authentification - avec timeout adapté au serveur
    console.log(`🔑 [${Date.now() - startTime}ms] Authentification sur ${serverConfig.name}...`)
    const authPlain = await sendCommand('AUTH PLAIN')
    if (authPlain.startsWith('334')) {
      const authString = `\0${config.username}\0${config.password}`
      const authB64 = btoa(authString)
      const authResult = await sendCommand(authB64, serverConfig.readTimeout + 5000) // Plus de temps pour l'auth
      if (!authResult.startsWith('235')) {
        throw new Error(`Authentification échouée sur ${serverConfig.name}: ${authResult}`)
      }
    } else {
      throw new Error(`AUTH PLAIN non supporté par ${serverConfig.name}: ${authPlain}`)
    }
    
    console.log(`✅ [${Date.now() - startTime}ms] Authentification réussie sur ${serverConfig.name}`)
    
    // 5. Test d'envoi avec timeouts adaptés au serveur
    console.log(`📧 [${Date.now() - startTime}ms] Début envoi email de test via ${serverConfig.name}...`)
    await sendCommand(`MAIL FROM:<${config.from_email}>`)
    await sendCommand(`RCPT TO:<${testEmail}>`)
    await sendCommand('DATA')
    
    const emailContent = [
      `From: ${config.from_name} <${config.from_email}>`,
      `To: ${testEmail}`,
      `Subject: Test SMTP ${serverConfig.name} - ${new Date().toLocaleString('fr-FR')}`,
      `Date: ${new Date().toISOString()}`,
      ``,
      `Test SMTP réussi depuis ${serverConfig.name}`,
      `Serveur: ${config.host}:${config.port}`,
      `Type: ${serverConfig.name}`,
      `Durée totale: ${Date.now() - startTime}ms`,
      `Timestamp: ${new Date().toISOString()}`,
      `.`
    ].join('\r\n') + '\r\n'
    
    await socket.write(encoder.encode(emailContent))
    const sendResult = await readWithTimeout(serverConfig.sendTimeout)
    
    if (!sendResult.startsWith('250')) {
      throw new Error(`Erreur envoi: ${sendResult}`)
    }
    
    await sendCommand('QUIT', 5000)
    
    const duration = Date.now() - startTime
    console.log(`✅ [${duration}ms] Email envoyé avec succès via ${serverConfig.name}`)
    
    return {
      success: true,
      message: `Email de test envoyé avec succès à ${testEmail} via ${serverConfig.name}`,
      details: `Durée totale: ${duration}ms | Serveur: ${config.host}:${config.port} | Type: ${serverConfig.name} | Protocole: ${config.port === 465 ? 'SSL' : config.port === 587 ? 'STARTTLS' : 'SMTP'}`,
      responseTime: duration
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [${duration}ms] Erreur SMTP avec ${serverConfig.name}:`, error.message)
    
    // Générer des suggestions spécifiques au serveur et à l'erreur
    const suggestions = getErrorSuggestions(error, serverConfig, config.host, config.port);
    
    return {
      success: false,
      error: `Erreur ${serverConfig.name}`,
      details: `${error.message} (${duration}ms) | Serveur: ${config.host}:${config.port}`,
      responseTime: duration,
      suggestions: suggestions
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
