
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Edit, 
  Copy, 
  Trash2, 
  Eye, 
  Star,
  Calendar,
  Tag,
  BarChart3
} from 'lucide-react';
import { ExtendedEmailTemplate } from '@/hooks/useEmailTemplates';

interface TemplateCardProps {
  template: ExtendedEmailTemplate;
  onEdit: (template: ExtendedEmailTemplate) => void;
  onDuplicate: (template: ExtendedEmailTemplate) => void;
  onDelete: (template: ExtendedEmailTemplate) => void;
  onPreview: (template: ExtendedEmailTemplate) => void;
  onToggleFavorite: (template: ExtendedEmailTemplate) => void;
}

export default function TemplateCard({ 
  template, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onPreview, 
  onToggleFavorite 
}: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const generatePreview = (htmlContent: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    return textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
  };

  return (
    <Card 
      className="h-full transition-shadow hover:shadow-lg cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {template.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {template.template_categories?.name || template.category}
              </Badge>
              {template.missions && (
                <Badge variant="outline" className="text-xs">
                  {template.missions.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(template);
            }}
            className="flex-shrink-0"
          >
            <Heart 
              className={`h-4 w-4 ${template.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Miniature/Preview */}
        <div className="bg-gray-50 rounded-md p-3 mb-3 h-24 overflow-hidden">
          <div className="text-xs text-gray-600 line-clamp-4">
            {generatePreview(template.html_content)}
          </div>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            {template.usage_count} utilisations
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(template.updated_at).toLocaleDateString('fr-FR')}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-2 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template);
            }}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-1" />
            Aperçu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(template);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(template);
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {!template.is_system_template && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(template);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
