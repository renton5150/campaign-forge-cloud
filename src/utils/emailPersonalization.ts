export interface PersonalizationVariable {
  key: string;
  label: string;
  description: string;
  category: 'standard' | 'custom';
  example?: string;
}

export interface ContactPersonalizationData {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
  custom_fields?: Record<string, any>;
}

// Variables standard disponibles
export const STANDARD_VARIABLES: PersonalizationVariable[] = [
  {
    key: 'EMAIL',
    label: 'Email',
    description: 'Adresse email du contact',
    category: 'standard',
    example: 'john.doe@example.com'
  },
  {
    key: 'PRENOM',
    label: 'Prénom',
    description: 'Prénom du contact',
    category: 'standard',
    example: 'John'
  },
  {
    key: 'NOM',
    label: 'Nom',
    description: 'Nom de famille du contact',
    category: 'standard',
    example: 'Doe'
  },
  {
    key: 'NOM_COMPLET',
    label: 'Nom complet',
    description: 'Prénom et nom du contact',
    category: 'standard',
    example: 'John Doe'
  },
  {
    key: 'ENTREPRISE',
    label: 'Entreprise',
    description: 'Nom de l\'entreprise',
    category: 'standard',
    example: 'Acme Corp'
  },
  {
    key: 'TELEPHONE',
    label: 'Téléphone',
    description: 'Numéro de téléphone',
    category: 'standard',
    example: '+33 1 23 45 67 89'
  }
];

// Fonction pour extraire les champs personnalisés uniques d'une liste de contacts
export function extractCustomFields(contacts: ContactPersonalizationData[]): PersonalizationVariable[] {
  const customFieldsSet = new Set<string>();
  
  contacts.forEach(contact => {
    if (contact.custom_fields) {
      Object.keys(contact.custom_fields).forEach(key => {
        customFieldsSet.add(key);
      });
    }
  });

  return Array.from(customFieldsSet).map(key => ({
    key: key.toUpperCase(),
    label: key.charAt(0).toUpperCase() + key.slice(1),
    description: `Champ personnalisé: ${key}`,
    category: 'custom' as const,
    example: 'Valeur exemple'
  }));
}

// Fonction pour obtenir toutes les variables disponibles
export function getAllVariables(contacts: ContactPersonalizationData[] = []): PersonalizationVariable[] {
  const customVariables = extractCustomFields(contacts);
  return [...STANDARD_VARIABLES, ...customVariables];
}

// Fonction pour remplacer les variables dans un texte
export function replaceVariables(
  text: string, 
  contactData: ContactPersonalizationData,
  fallbackValue: string = ''
): string {
  if (!text) return '';
  
  return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
    const cleanVariableName = variableName.trim().toUpperCase();
    
    switch (cleanVariableName) {
      case 'EMAIL':
        return contactData.email || fallbackValue;
      case 'PRENOM':
        return contactData.first_name || fallbackValue;
      case 'NOM':
        return contactData.last_name || fallbackValue;
      case 'NOM_COMPLET':
        const fullName = [contactData.first_name, contactData.last_name]
          .filter(Boolean)
          .join(' ');
        return fullName || fallbackValue;
      case 'ENTREPRISE':
        return contactData.company || fallbackValue;
      case 'TELEPHONE':
        return contactData.phone || fallbackValue;
      default:
        // Rechercher dans les champs personnalisés
        const customValue = contactData.custom_fields?.[cleanVariableName.toLowerCase()];
        return customValue?.toString() || fallbackValue;
    }
  });
}

// Fonction pour valider les variables dans un texte
export function validateVariables(text: string, availableVariables: PersonalizationVariable[]): {
  valid: boolean;
  invalidVariables: string[];
} {
  const variableMatches = text.match(/\{\{([^}]+)\}\}/g);
  if (!variableMatches) return { valid: true, invalidVariables: [] };

  const invalidVariables: string[] = [];
  const availableKeys = availableVariables.map(v => v.key);

  variableMatches.forEach(match => {
    const variableName = match.replace(/\{\{|\}\}/g, '').trim().toUpperCase();
    if (!availableKeys.includes(variableName)) {
      invalidVariables.push(variableName);
    }
  });

  return {
    valid: invalidVariables.length === 0,
    invalidVariables
  };
}

// Fonction pour générer un aperçu avec données d'exemple
export function generatePreview(
  htmlContent: string,
  sampleData?: Partial<ContactPersonalizationData>
): string {
  if (!htmlContent) return '';
  
  const defaultSampleData: ContactPersonalizationData = {
    email: 'john.doe@example.com',
    first_name: 'John',
    last_name: 'Doe',
    company: 'Acme Corp',
    phone: '+33 1 23 45 67 89',
    custom_fields: {
      poste: 'Développeur',
      secteur: 'Technologie'
    }
  };

  const mergedData = { ...defaultSampleData, ...sampleData };
  
  // Traiter le contenu HTML en préservant la structure
  return replaceVariables(htmlContent, mergedData, '[Non défini]');
}
