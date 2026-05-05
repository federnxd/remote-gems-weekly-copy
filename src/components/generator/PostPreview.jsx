import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function PostPreview({ content, onSave, onRegenerate, isSaving }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Post copied to clipboard!');
  };

  if (!content) {
    return (
      <Card className="p-8 flex flex-col items-center justify-center text-center min-h-[300px] border-dashed">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <span className="text-2xl">✍️</span>
        </div>
        <p className="text-sm font-medium text-muted-foreground">Your generated post will appear here</p>
        <p className="text-xs text-muted-foreground mt-1">Select a strategy, pick roles, and hit Generate</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold">Preview</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" />
            Save
          </Button>
        </div>
      </div>
      
      {/* LinkedIn-style preview */}
      <div className="p-6 bg-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold">You</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Your Name</p>
            <p className="text-xs text-muted-foreground">Audio Expert Reviewer at micro1 • 1st</p>
          </div>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed font-normal">
          {content}
        </div>
      </div>

      {/* Character count */}
      <div className="px-6 py-3 border-t border-border bg-muted/30">
        <p className="text-xs text-muted-foreground">
          {content.length} characters • LinkedIn max: 3,000 
          {content.length > 3000 && <span className="text-destructive ml-1">⚠ Over limit</span>}
        </p>
      </div>
    </Card>
  );
}