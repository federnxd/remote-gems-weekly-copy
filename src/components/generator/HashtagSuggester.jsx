import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Hash, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function HashtagSuggester({ content, selectedRoles, onInsertHashtag }) {
  const [hashtags, setHashtags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inserted, setInserted] = useState(new Set());

  const handleGenerate = async () => {
    if (!content) {
      toast.error('Generate a post first to get hashtag suggestions');
      return;
    }
    setIsLoading(true);
    setInserted(new Set());

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a LinkedIn content strategist. Analyze this recruitment post and suggest the 5 best hashtags that will maximize reach and engagement with the target audience.

POST CONTENT:
${content}

TARGET ROLES: ${selectedRoles.length > 0 ? selectedRoles.join(', ') : 'general tech/business professionals'}

REQUIREMENTS:
- Focus on hashtags that are actively followed by professionals in the target roles
- Mix high-volume general hashtags with niche, high-conversion ones
- Prioritize hashtags used by active LinkedIn recruiters and job seekers
- Avoid overly generic tags like #jobs or #hiring that are too competitive
- Include industry-specific tags when relevant
- Each hashtag should start with # (no spaces)

Return ONLY a JSON object in this format:
{
  "hashtags": [
    { "tag": "#ExampleTag", "reach": "high|medium|niche", "reason": "brief one-line reason" },
    ...
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          hashtags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tag: { type: 'string' },
                reach: { type: 'string' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });

    setHashtags(result.hashtags || []);
    setIsLoading(false);
  };

  const handleInsert = (tag) => {
    onInsertHashtag(tag);
    setInserted(prev => new Set([...prev, tag]));
    toast.success(`${tag} added to post`);
  };

  const reachColors = {
    high: 'bg-blue-100 text-blue-700 border-blue-200',
    medium: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    niche: 'bg-violet-100 text-violet-700 border-violet-200',
  };

  const reachLabels = {
    high: 'High reach',
    medium: 'Mid reach',
    niche: 'Niche',
  };

  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">AI Hashtag Suggestions</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={isLoading || !content}
          className="gap-1.5 text-xs"
        >
          {isLoading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> {hashtags.length > 0 ? 'Refresh' : 'Suggest'}</>
          )}
        </Button>
      </div>

      {hashtags.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Generate a post first, then click <strong>Suggest</strong> to get AI-powered hashtag recommendations.
        </p>
      )}

      {hashtags.length > 0 && (
        <div className="space-y-2">
          {hashtags.map(({ tag, reach, reason }) => (
            <div key={tag} className="flex items-start gap-2 group">
              <button
                onClick={() => !inserted.has(tag) && handleInsert(tag)}
                className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                  inserted.has(tag)
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-border hover:bg-primary hover:border-primary hover:text-white text-muted-foreground'
                }`}
              >
                {inserted.has(tag) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-primary">{tag}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${reachColors[reach] || reachColors.medium}`}>
                    {reachLabels[reach] || reach}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}