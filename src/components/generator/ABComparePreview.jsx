import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STRATEGY_COLORS = {
  targeted_role: 'border-blue-400 bg-blue-50',
  storytelling: 'border-amber-400 bg-amber-50',
  urgency: 'border-red-400 bg-red-50',
  social_proof: 'border-green-400 bg-green-50',
  niche_community: 'border-purple-400 bg-purple-50',
  carousel_text: 'border-cyan-400 bg-cyan-50',
};

const STRATEGY_BADGE = {
  targeted_role: 'bg-blue-100 text-blue-700',
  storytelling: 'bg-amber-100 text-amber-700',
  urgency: 'bg-red-100 text-red-700',
  social_proof: 'bg-green-100 text-green-700',
  niche_community: 'bg-purple-100 text-purple-700',
  carousel_text: 'bg-cyan-100 text-cyan-700',
};

function VariantPanel({ label, strategy, content, onSave, isSaving, isGenerating }) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success('Copied!');
  };

  return (
    <div className={cn('flex-1 min-w-0 rounded-xl border-2 overflow-hidden', STRATEGY_COLORS[strategy] || 'border-border bg-card')}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">{label}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STRATEGY_BADGE[strategy] || 'bg-muted text-muted-foreground')}>
            {strategy?.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!content} className="h-7 px-2 text-xs gap-1">
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving || !content} className="h-7 px-2 text-xs gap-1">
            <Save className="w-3 h-3" /> Save
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[280px] bg-white/60">
        {isGenerating ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : content ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{content}</p>
        ) : (
          <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
            Hit "Generate A/B" to create this variant
          </div>
        )}
      </div>

      {/* Footer stats */}
      {content && (
        <div className="px-4 py-2 border-t border-black/5 bg-white/40 text-[10px] text-muted-foreground">
          {content.length} chars
          {content.length > 3000 && <span className="text-destructive ml-2">⚠ Over LinkedIn limit</span>}
        </div>
      )}
    </div>
  );
}

export default function ABComparePreview({ strategyA, strategyB, contentA, contentB, isGenerating, onSaveA, onSaveB, isSaving }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="text-xs font-semibold">A/B Strategy Comparison</span>
        <span className="text-[10px] text-muted-foreground">— Save each variant independently to track performance</span>
      </div>
      <div className="p-4 flex flex-col lg:flex-row gap-4">
        <VariantPanel
          label="Variant A"
          strategy={strategyA}
          content={contentA}
          onSave={onSaveA}
          isSaving={isSaving}
          isGenerating={isGenerating}
        />
        <VariantPanel
          label="Variant B"
          strategy={strategyB}
          content={contentB}
          onSave={onSaveB}
          isSaving={isSaving}
          isGenerating={isGenerating}
        />
      </div>
    </Card>
  );
}