
import { supabase } from '@/integrations/supabase/client';

/**
 * Génère un token de désabonnement unique pour un email et un tenant
 */
export async function generateUnsubscribeToken(
  email: string,
  tenantId: string,
  campaignId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('create_unsubscribe_token', {
    p_email: email,
    p_tenant_id: tenantId,
    p_campaign_id: campaignId
  });

  if (error) {
    console.error('Erreur lors de la génération du token:', error);
    throw error;
  }

  return data;
}

/**
 * Génère l'URL complète de désabonnement
 */
export function generateUnsubscribeUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/unsubscribe/${token}`;
}

/**
 * Remplace les variables de personnalisation dans le contenu HTML
 * Ajoute automatiquement le lien de désabonnement
 */
export async function addUnsubscribeLinkToContent(
  htmlContent: string,
  email: string,
  tenantId: string,
  campaignId?: string,
  baseUrl?: string
): Promise<string> {
  try {
    // Générer le token de désabonnement
    const token = await generateUnsubscribeToken(email, tenantId, campaignId);
    const unsubscribeUrl = generateUnsubscribeUrl(token, baseUrl);

    // Remplacer la variable {{unsubscribe_link}} par l'URL réelle
    let processedContent = htmlContent.replace(
      /{{unsubscribe_link}}/g,
      unsubscribeUrl
    );

    // Si aucun lien de désabonnement n'existe, l'ajouter automatiquement en bas
    if (!processedContent.includes('{{unsubscribe_link}}') && !processedContent.includes('/unsubscribe/')) {
      const unsubscribeFooter = `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
          <p>
            Vous recevez cet email car vous êtes inscrit à notre liste de diffusion.
            <br>
            <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">
              Cliquez ici pour vous désabonner
            </a>
          </p>
        </div>
      `;

      // Ajouter avant la balise de fermeture </body> ou à la fin
      if (processedContent.includes('</body>')) {
        processedContent = processedContent.replace('</body>', unsubscribeFooter + '</body>');
      } else {
        processedContent += unsubscribeFooter;
      }
    }

    return processedContent;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du lien de désabonnement:', error);
    // En cas d'erreur, retourner le contenu original
    return htmlContent;
  }
}

/**
 * Valide un token de désabonnement
 */
export async function validateUnsubscribeToken(token: string): Promise<{
  isValid: boolean;
  tokenData?: any;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('unsubscribe_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return {
        isValid: false,
        error: 'Token invalide ou expiré'
      };
    }

    return {
      isValid: true,
      tokenData: data
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Erreur lors de la validation du token'
    };
  }
}

/**
 * Nettoie les tokens expirés (à utiliser dans une tâche cron)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { data, error } = await supabase.rpc('cleanup_expired_unsubscribe_tokens');
  
  if (error) {
    console.error('Erreur lors du nettoyage des tokens expirés:', error);
    throw error;
  }

  return data;
}
