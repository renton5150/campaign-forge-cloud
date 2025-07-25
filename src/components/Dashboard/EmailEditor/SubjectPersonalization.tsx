
import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Type, Plus } from 'lucide-react';
import { PersonalizationVariable, getAllVariables, generatePreview } from '@/utils/emailPersonalization';

interface SubjectPersonalizationProps {
  subject: string;
  onSubjectChange: (subject: string) => void;
  availableContacts?: any[];
  className?: string;
}

export default function SubjectPersonalization({
  subject,
  onSubjectChange,
  availableContacts = [],
  className = ''
}: SubjectPersonalizationProps) {
  const [showVariables, setShowVariables] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const variables = getAllVariables(availableContacts);
  const previewSubject = generatePreview(subject);

  const handleInsertVariable = (variable: PersonalizationVariable) => {
    const input = inputRef.current;
    if (input) {
      const cursorPosition = input.selectionStart || 0;
      const variableText = `{{${variable.key}}}`;
      const newSubject = subject.slice(0, cursorPosition) + variableText + subject.slice(cursorPosition);
      onSubjectChange(newSubject);
      
      // Repositionner le curseur après la variable insérée
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(
          cursorPosition + variableText.length,
          cursorPosition + variableText.length
        );
      }, 0);
    }
    setShowVariables(false);
  };

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="subject">Objet de l'email</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="Ex: Bonjour {{PRENOM}}, découvrez nos nouveautés"
            className="flex-1"
          />
          <Popover open={showVariables} onOpenChange={setShowVariables}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Type className="h-4 w-4 mr-1" />
                Variables
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-3">
                <h4 className="font-medium">Variables disponibles</h4>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {variables.map((variable) => (
                    <Button
                      key={variable.key}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInsertVariable(variable)}
                      className="justify-start h-auto p-2"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {variable.key}
                          </Badge>
                          <span className="text-sm">{variable.label}</span>
                        </div>
                        <Plus className="h-3 w-3" />
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Aperçu de l'objet */}
        {subject && subject !== previewSubject && (
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-xs text-blue-700">Aperçu de l'objet :</Label>
            <div className="text-sm text-blue-800 mt-1">{previewSubject}</div>
          </div>
        )}
      </div>
    </div>
  );
}
