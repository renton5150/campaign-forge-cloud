
export interface EmailComponent {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'footer';
  props: Record<string, any>;
  styles: Record<string, any>;
}

export interface EmailEditorState {
  components: EmailComponent[];
  globalStyles: {
    backgroundColor: string;
    fontFamily: string;
    maxWidth: string;
    padding: string;
  };
  variables: Record<string, string>;
  history: EmailEditorState[];
  currentVersion: number;
}

export interface DragItem {
  type: string;
  id?: string;
  index?: number;
}
