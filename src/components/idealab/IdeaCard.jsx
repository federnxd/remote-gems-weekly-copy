import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookmarkPlus, CheckCircle2, ChevronDown, ChevronUp, Loader2, ListTree } from 'lucide-react';
import ImageGeneratorButton from '@/components/idealab/ImageGeneratorButton';

const STRATEGY_COLORS = {
  targeted_role:    'bg-blue-50 text-blue-700 border-blue-200',
  storytelling:     'bg-purple-50 text-purple-700 border-purple-200',
  urgency:          'bg-red-50 text-red-700 border-red-200',
  social_proof:     'bg-green-50 text-green-700 border-green-200',
  niche_community:  'bg-orange-50 text-orange-700 border-orange-200',
  carousel_text:    'bg-pink-50 text-pink-700 border-pink-200',
};

export default function IdeaCard({ idea, saved, isSaving, onSave }) {
  const [expanded, setExpanded] = useState(false);

  const strategyLabel = (idea.strategy || '').replace(/_/g, ' ');
  const colorClass = STRATEGY_COLORS[idea.strategy] || 'bg-muted text-muted-foreground border-border';

  return (
    <div className="rounded-xl border bg-card shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 space-y-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug">{idea.title}</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${colorClass}`}>
            {strategyLabel}
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-xs text-muted-foreground leading-relaxed">{idea.reasoning}</p>

        {/* Structure */}
        <div className="rounded-lg bg-muted/40 p-3 border">
          <div className="flex items-center gap-1.5 mb-2">
            <ListTree className="w-3 h-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Content Structure</p>
          </div>
          <p className="text-xs text-foreground/70 whitespace-pre-line leading-relaxed">{idea.structure}</p>
        </div>

        {/* Full content toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide full draft' : 'Preview full draft'}
        </button>

        {expanded && (
          <div className="rounded-lg border bg-muted/20 p-3 max-h-56 overflow-y-auto">
            <p className="text-xs whitespace-pre-wrap leading-relaxed text-foreground/80">{idea.content}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 space-y-2">
        <ImageGeneratorButton idea={idea} />
        <Button
          size="sm"
          className="w-full gap-2"
          variant={saved ? 'secondary' : 'default'}
          disabled={saved || isSaving}
          onClick={onSave}
        >
          {saved ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Saved as Draft</>
          ) : isSaving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          ) : (
            <><BookmarkPlus className="w-3.5 h-3.5" /> Save as Draft</>
          )}
        </Button>
      </div>
    </div>
  );
}