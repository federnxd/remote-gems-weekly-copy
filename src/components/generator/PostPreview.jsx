import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Save, RotateCcw, CalendarClock, ThumbsUp, MessageSquare, Repeat2, Share, Heart, BarChart2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X / Twitter' },
];

function LinkedInMockup({ content }) {
  const [expanded, setExpanded] = useState(false);
  const CUTOFF = 280;
  const shouldTruncate = content.length > CUTOFF;
  const displayText = shouldTruncate && !expanded ? content.slice(0, CUTOFF) + '…' : content;

  return (
    <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-sm font-['system-ui'] max-w-[540px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">You</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[14px] font-semibold text-[#000000E6]">Your Name</p>
            <span className="text-[#0a66c2] text-xs">• 1st</span>
          </div>
          <p className="text-[12px] text-[#666] leading-tight">Audio Expert Reviewer at micro1</p>
          <p className="text-[11px] text-[#888]">Just now • 🌐</p>
        </div>
        <button className="text-[#0a66c2] text-[13px] font-semibold hover:bg-blue-50 px-3 py-1 rounded-full whitespace-nowrap">+ Follow</button>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-[14px] text-[#000000E6] leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[13px] text-[#666] font-semibold hover:underline mt-1"
          >
            {expanded ? 'see less' : 'see more'}
          </button>
        )}
      </div>

      {/* Engagement bar */}
      <div className="px-4 pb-1">
        <div className="flex items-center justify-between text-[12px] text-[#666] border-b border-[#e0e0e0] pb-2">
          <div className="flex items-center gap-1">
            <span className="bg-[#0a66c2] rounded-full w-4 h-4 inline-flex items-center justify-center text-white text-[9px]">👍</span>
            <span>142 reactions</span>
          </div>
          <span>18 comments • 7 reposts</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-around px-2 py-1">
        {[
          { icon: ThumbsUp, label: 'Like' },
          { icon: MessageSquare, label: 'Comment' },
          { icon: Repeat2, label: 'Repost' },
          { icon: Share, label: 'Send' },
        ].map(({ icon: Icon, label }) => (
          <button key={label} className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-[#f3f2ef] text-[#666] text-[13px] font-semibold transition-colors">
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TwitterMockup({ content }) {
  // Twitter: 280 char limit enforced visually
  const LIMIT = 280;
  const trimmed = content.slice(0, LIMIT * 2); // show generously but warn
  const overLimit = content.length > LIMIT;
  const charsLeft = LIMIT - content.length;

  return (
    <div className="bg-black rounded-2xl border border-[#2f3336] shadow-sm font-['system-ui'] max-w-[540px] mx-auto text-white">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">Y</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[15px] font-bold text-white">Your Name</p>
            <span className="text-[#1d9bf0]">✓</span>
            <span className="text-[#71767b] text-[14px] ml-1">@yourhandle · now</span>
          </div>
          <p className="text-[15px] text-[#e7e9ea] leading-relaxed whitespace-pre-wrap break-words">
            {content.slice(0, 560)}
            {content.length > 560 && '…'}
          </p>
        </div>
      </div>

      {/* Char indicator */}
      {overLimit && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <div className="w-8 h-8 relative flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-8 h-8 -rotate-90">
              <circle cx="16" cy="16" r="13" fill="none" stroke="#2f3336" strokeWidth="3" />
              <circle cx="16" cy="16" r="13" fill="none" stroke="#f4212e" strokeWidth="3"
                strokeDasharray={`${Math.min(100, ((content.length - LIMIT) / LIMIT) * 82) + 82} 82`} />
            </svg>
          </div>
          <span className="text-[#f4212e] text-xs">Over 280 chars — trim for Twitter</span>
        </div>
      )}

      {/* Engagement */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#2f3336] text-[#71767b]">
        {[
          { icon: MessageSquare, count: '14' },
          { icon: Repeat2, count: '32' },
          { icon: Heart, count: '218' },
          { icon: BarChart2, count: '4.2K' },
          { icon: Bookmark, count: null },
          { icon: Share, count: null },
        ].map(({ icon: Icon, count }, i) => (
          <button key={i} className="flex items-center gap-1.5 hover:text-[#1d9bf0] transition-colors text-[13px]">
            <Icon className="w-4 h-4" />
            {count && <span>{count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PostPreview({ content, onSave, onSaveScheduled, scheduledDate, scheduledTime, onRegenerate, isSaving }) {
  const [platform, setPlatform] = useState('linkedin');

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
      {/* Toolbar */}
      <div className="p-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
        {/* Platform switcher */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-all',
                platform === p.id
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button size="sm" onClick={onSave} disabled={isSaving} variant="outline" className="gap-1.5 text-xs">
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </Button>
          {onSaveScheduled && (
            <Button size="sm" onClick={onSaveScheduled} disabled={isSaving} className="gap-1.5 text-xs">
              <CalendarClock className="w-3.5 h-3.5" />
              Schedule {scheduledDate ? format(scheduledDate, 'MMM d') : ''}
            </Button>
          )}
        </div>
      </div>

      {/* Mockup area */}
      <div className={cn(
        'p-6',
        platform === 'twitter' ? 'bg-[#16181c]' : 'bg-[#f3f2ef]'
      )}>
        {platform === 'linkedin'
          ? <LinkedInMockup content={content} />
          : <TwitterMockup content={content} />
        }
      </div>

      {/* Footer stats */}
      <div className="px-5 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {content.length} chars
          {platform === 'linkedin' && content.length > 3000 && <span className="text-destructive ml-1">⚠ Over LinkedIn limit (3,000)</span>}
          {platform === 'twitter' && content.length > 280 && <span className="text-amber-500 ml-1">⚠ Over Twitter limit (280)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {platform === 'linkedin' ? `LinkedIn max: 3,000` : 'Twitter max: 280'}
        </p>
      </div>
    </Card>
  );
}