
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erreur lors de la lecture du localStorage pour ${key}:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Erreur lors de l'écriture dans localStorage pour ${key}:`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Erreur lors de la suppression du localStorage pour ${key}:`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

export function useFormBackup(formData: any, campaignId?: string) {
  const backupKey = `campaign_backup_${campaignId || 'new'}`;
  const [backup, setBackup, removeBackup] = useLocalStorage(backupKey, null);

  useEffect(() => {
    if (formData && (formData.name || formData.subject || formData.html_content)) {
      setBackup({
        ...formData,
        lastBackup: new Date().toISOString()
      });
    }
  }, [formData?.name, formData?.subject, formData?.html_content]);

  const clearBackup = () => {
    removeBackup();
  };

  const hasBackup = backup && backup.lastBackup;

  return {
    backup,
    hasBackup,
    clearBackup
  };
}
