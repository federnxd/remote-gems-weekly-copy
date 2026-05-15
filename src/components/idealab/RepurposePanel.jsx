import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, BookmarkPlus, CheckCircle2, ChevronDown, ChevronUp, Twitter, FileText, Mail } from 'lucide-react';
import { toast } from 'sonner';

const FORMAT_META = [
  {
    key: 'tweet_thread',
    label: 'Tweet Thread',
    icon: Twitter,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    strategy: 'carousel_text',
    description: 'Short punchy thread (5–7 tweets)',
  },
  {
    key: 'blog_post',
    label: 'Short-Form Blog',
    icon: FileText,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    strategy: 'storytelling',
    description: '300–400 word conversational article',
  },
  {
    key: 'newsletter',
    label: 'Newsletter Snippet',
    icon: Mail,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    strategy: 'social_proof',
    description: 'Punchy email-ready paragraph',
  },
];

function VariationCard({ format, content, postTitle, onSave, isSaved }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = format.icon;
  const preview = content.slice(0, 200);
  const needsExpand = content.length > 200;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className={`rounded-xl border ${format.border} bg-card overflow-hidden`}>
      <div className={`flex items-center gap-2.5 px-4 py-3 ${format.bg}`}>
        <Icon className={`w-4 h-4 ${format.color}`} />
        <span className={`text-xs font-semibold ${format.color}`}>{format.label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{format.description}</span>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {expanded || !needsExpand ? content : preview + '…'}
        </p>
        {needsExpand && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[10px] text-primary mt-2 hover:underline"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
          </button>
        )}
      </div>
      <div className="flex gap-2 px-4 pb-4">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleCopy}>
          <Copy className="w-3 h-3" /> Copy
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={onSave}
          disabled={isSaved}
          variant={isSaved ? 'secondary' : 'default'}
        >
          {isSaved ? <><CheckCircle2 className="w-3 h-3" /> Saved</> : <><BookmarkPlus className="w-3 h-3" /> Save draft</>}
        </Button>
      </div>
    </div>
  );
}

export default function RepurposePanel({ topPosts }) {
  const [selectedPostId, setSelectedPostId] = useState('');
  const [variations, setVariations] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedKeys, setSavedKeys] = useState(new Set());
  const queryClient = useQueryClient();

  const selectedPost = topPosts.find(p => p.id === selectedPostId);

  const saveMutation = useMutation({
    mutationFn: ({ format, content }) =>
      base44.entities.GeneratedPost.create({
        title: `[${format.label}] ${selectedPost?.title || 'Repurposed post'}`,
        content,
        strategy: format.strategy,
        status: 'draft',
        notes: `Repurposed from post: "${selectedPost?.title}" via IdeaLab`,
      }),
    onSuccess: (_, { format }) => {
      setSavedKeys(prev => new Set([...prev, format.key]));
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success(`${format.label} saved as draft!`);
    },
  });

  const handleGenerate = async () => {
    if (!selectedPost) { toast.error('Select a post to repurpose'); return; }
    setIsGenerating(true);
    setVariations(null);
    setSavedKeys(new Set());

    const engagementLine = [
      selectedPost.impressions ? `${selectedPost.impressions.toLocaleString()} impressions` : null,
      selectedPost.likes ? `${selectedPost.likes} likes` : null,
      selectedPost.comments ? `${selectedPost.comments} comments` : null,
      selectedPost.shares ? `${selectedPost.shares} shares` : null,
      selectedPost.referrals ? `${selectedPost.referrals} referrals` : null,
    ].filter(Boolean).join(', ');

    const prompt = `You are a content repurposing expert. Below is a high-performing LinkedIn post. Repurpose it into 3 different formats while preserving the core message, authenticity, and referral call-to-action.

ORIGINAL POST TITLE: ${selectedPost.title}
PERFORMANCE: ${engagementLine || 'strong engagement'}
STRATEGY: ${selectedPost.strategy?.replace(/_/g, ' ')}

ORIGINAL CONTENT:
${selectedPost.content}

Generate all 3 formats. Keep the micro1 referral link wherever appropriate: https://refer.micro1.ai/referral/jobs?referralCode=eaa2768a-4116-40a1-b897-971506bb359e

Return a JSON object with this exact structure:
{
  "tweet_thread": "Full tweet thread. Format as numbered tweets: '1/ ...\\n\\n2/ ...\\n\\n3/ ...' etc. 5–7 tweets. Each tweet max 280 chars. End with the referral link.",
  "blog_post": "A 300–400 word conversational short-form blog post. Use a compelling headline, 3–4 paragraphs, and close with a CTA including the referral link. No markdown headers.",
  "newsletter": "A 100–150 word newsletter-ready snippet. Warm and personal tone. One short paragraph + a punchy CTA line with the referral link."
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          tweet_thread: { type: 'string' },
          blog_post: { type: 'string' },
          newsletter: { type: 'string' },
        },
      },
    });

    setVariations(result);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-4">
      {/* Post picker */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Select a top-performing post to repurpose
          </label>
          <select
            value={selectedPostId}
            onChange={e => { setSelectedPostId(e.target.value); setVariations(null); setSavedKeys(new Set()); }}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">— choose a post —</option>
            {topPosts.map(p => {
              const score = (p.impressions || 0) + (p.referrals || 0) * 100 + (p.likes || 0) * 5;
              const badge = p.referrals > 0 ? `🙋 ${p.referrals} ref` : p.impressions ? `👁 ${p.impressions.toLocaleString()}` : '';
              return (
                <option key={p.id} value={p.id}>
                  {p.title} {badge ? `(${badge})` : ''}
                </option>
              );
            })}
          </select>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating || !selectedPostId} className="gap-2 shrink-0">
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Repurpose</>}
        </Button>
      </div>

      {/* Selected post preview */}
      {selectedPost && !variations && !isGenerating && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{selectedPost.title}</p>
          <div className="flex gap-3 flex-wrap">
            {selectedPost.impressions > 0 && <span>👁 {selectedPost.impressions.toLocaleString()} impressions</span>}
            {selectedPost.likes > 0 && <span>❤ {selectedPost.likes} likes</span>}
            {selectedPost.comments > 0 && <span>💬 {selectedPost.comments} comments</span>}
            {selectedPost.shares > 0 && <span>🔁 {selectedPost.shares} shares</span>}
            {selectedPost.referrals > 0 && <span>🙋 {selectedPost.referrals} referrals</span>}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isGenerating && (
        <div className="grid md:grid-cols-3 gap-4">
          {FORMAT_META.map(f => (
            <div key={f.key} className={`rounded-xl border ${f.border} animate-pulse`}>
              <div className={`h-10 ${f.bg} rounded-t-xl`} />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variations */}
      {variations && !isGenerating && (
        <div className="grid md:grid-cols-3 gap-4">
          {FORMAT_META.map(f => (
            <VariationCard
              key={f.key}
              format={f}
              content={variations[f.key] || '(No content generated)'}
              postTitle={selectedPost?.title}
              isSaved={savedKeys.has(f.key)}
              onSave={() => saveMutation.mutate({ format: f, content: variations[f.key] })}
            />
          ))}
        </div>
      )}

      {topPosts.length === 0 && (
        <p className="text-xs text-amber-600 text-center py-4">
          No published posts with engagement data yet — publish posts and log metrics first.
        </p>
      )}
    </div>
  );
}