
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Save, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SaveStatusIndicatorProps {
  lastSaved?: Date;
  isAutoSaving?: boolean;
  hasUnsavedChanges?: boolean;
  error?: string;
}

export default function SaveStatusIndicator({
  lastSaved,
  isAutoSaving,
  hasUnsavedChanges,
  error
}: SaveStatusIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 0) {
        setTimeAgo(`il y a ${minutes} min`);
      } else {
        setTimeAgo(`il y a ${seconds} sec`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Erreur de sauvegarde
      </Badge>
    );
  }

  if (isAutoSaving) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3 animate-spin" />
        Sauvegarde en cours...
      </Badge>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Save className="h-3 w-3" />
        Modifications non sauvegardées
      </Badge>
    );
  }

  if (lastSaved) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Sauvegardé {timeAgo}
      </Badge>
    );
  }

  return null;
}
