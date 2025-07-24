
import { supabase } from '@/integrations/supabase/client';

export interface ContactCleaningResult {
  originalContacts: ContactForCampaign[];
  cleanedContacts: ContactForCampaign[];
  filteredByEmail: ContactForCampaign[];
  filteredByDomain: ContactForCampaign[];
  duplicatesRemoved: ContactForCampaign[];
  stats: {
    originalCount: number;
    cleanedCount: number;
    filteredByEmailCount: number;
    filteredByDomainCount: number;
    duplicatesRemovedCount: number;
  };
}

export interface ContactForCampaign {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
}

export interface BlacklistItem {
  id: string;
  type: 'email' | 'domain';
  value: string;
}

export async function cleanContactsForCampaign(
  contactListIds: string[],
  blacklistListIds: string[] = [],
  tenantId: string | null
): Promise<ContactCleaningResult> {
  // 1. Récupérer tous les contacts des listes sélectionnées
  const { data: contacts, error: contactsError } = await supabase
    .from('contact_list_memberships')
    .select(`
      contacts!inner(
        id,
        email,
        first_name,
        last_name,
        status
      )
    `)
    .in('list_id', contactListIds)
    .eq('contacts.status', 'active');

  if (contactsError) throw contactsError;

  const originalContacts: ContactForCampaign[] = contacts?.map((item: any) => item.contacts) || [];

  // 2. Récupérer tous les éléments de blacklist applicables
  let blacklistQuery = supabase
    .from('blacklists')
    .select('id, type, value');

  // Filtre par tenant (tenant spécifique + global pour super admin)
  if (tenantId) {
    blacklistQuery = blacklistQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
  } else {
    blacklistQuery = blacklistQuery.is('tenant_id', null);
  }

  const { data: allBlacklists, error: blacklistError } = await blacklistQuery;
  if (blacklistError) throw blacklistError;

  // 3. Si des listes de blacklist sont spécifiées, ne garder que les éléments de ces listes
  let applicableBlacklists: BlacklistItem[] = (allBlacklists || []).map(item => ({
    id: item.id,
    type: item.type as 'email' | 'domain',
    value: item.value
  }));

  if (blacklistListIds.length > 0) {
    const { data: listAssociations, error: listError } = await supabase
      .from('blacklist_item_lists')
      .select('blacklist_id')
      .in('blacklist_list_id', blacklistListIds);

    if (listError) throw listError;

    const blacklistIds = listAssociations?.map(item => item.blacklist_id) || [];
    applicableBlacklists = applicableBlacklists.filter(item => blacklistIds.includes(item.id));
  }

  // 4. Séparer les blacklists par type
  const emailBlacklists = applicableBlacklists
    .filter(item => item.type === 'email')
    .map(item => item.value.toLowerCase());

  const domainBlacklists = applicableBlacklists
    .filter(item => item.type === 'domain')
    .map(item => item.value.toLowerCase());

  // 5. Filtrer les contacts
  const filteredByEmail: ContactForCampaign[] = [];
  const filteredByDomain: ContactForCampaign[] = [];
  const cleanedContacts: ContactForCampaign[] = [];

  for (const contact of originalContacts) {
    const email = contact.email.toLowerCase();
    const domain = email.split('@')[1];

    // Vérifier si l'email est blacklisté
    if (emailBlacklists.includes(email)) {
      filteredByEmail.push(contact);
      continue;
    }

    // Vérifier si le domaine est blacklisté
    if (domain && domainBlacklists.includes(domain)) {
      filteredByDomain.push(contact);
      continue;
    }

    cleanedContacts.push(contact);
  }

  // 6. Déduplication des contacts nettoyés
  const uniqueContacts = new Map<string, ContactForCampaign>();
  const duplicatesRemoved: ContactForCampaign[] = [];

  for (const contact of cleanedContacts) {
    const key = contact.email.toLowerCase();
    if (uniqueContacts.has(key)) {
      duplicatesRemoved.push(contact);
    } else {
      uniqueContacts.set(key, contact);
    }
  }

  const finalCleanedContacts = Array.from(uniqueContacts.values());

  return {
    originalContacts,
    cleanedContacts: finalCleanedContacts,
    filteredByEmail,
    filteredByDomain,
    duplicatesRemoved,
    stats: {
      originalCount: originalContacts.length,
      cleanedCount: finalCleanedContacts.length,
      filteredByEmailCount: filteredByEmail.length,
      filteredByDomainCount: filteredByDomain.length,
      duplicatesRemovedCount: duplicatesRemoved.length,
    },
  };
}
