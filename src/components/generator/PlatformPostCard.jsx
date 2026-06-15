import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, CalendarClock, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MultiPublishButton from './MultiPublishButton';
import HashtagSuggester from './HashtagSuggester';

const CHAR_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  facebook: 500,
  instagram: 500,
  mastodon: 500,
  bluesky: 300,
  threads: 500,
};

const PLATFORM_LABELS = {
  linkedin: 'LinkedIn', twitter: 'X / Twitter', facebook: 'Facebook',
  instagram: 'Instagram', mastodon: 'Mastodon', bluesky: 'Bluesky', threads: 'Threads',
};

function CharCount({ content, platform }) {
  const limit = CHAR_LIMITS[platform] || 500;
  const len = content?.length || 0;
  const over = len > limit;
  return (
    <span className={`text-[11px] ${over ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
      {len} / {limit}{over ? ` · over by ${len - limit}` : ''}
    </span>
  );
}

function VariantEditor({ label, platform, content, postId, selectedRoles, onEdit, onSave, scheduledDate, scheduledTime, onPublished }) {
  const copy = async () => { await navigator.clipboard.writeText(content || ''); toast.success('Copied!'); };
  return (
    <div className="space-y-2">
      {label && <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>}
      <Textarea
        value={content || ''}
        onChange={(e) => onEdit(e.target.value)}
        className="min-h-[160px] text-sm font-mono leading-relaxed"
      />
      <HashtagSuggester
        content={content}
        selectedRoles={selectedRoles}
        onInsertHashtag={(tag) => onEdit((content ? content.trimEnd() + '\n' : '') + tag)}
      />
      <div className="flex items-center justify-between">
        <CharCount content={content} platform={platform} />
        <div className="flex gap-1.5 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={copy} className="gap-1.5 text-xs h-8">
            <Copy className="w-3.5 h-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSave(false)} className="gap-1.5 text-xs h-8">
            <Save className="w-3.5 h-3.5" /> Save Draft
          </Button>
          {scheduledDate && (
            <Button size="sm" onClick={() => onSave(true)} className="gap-1.5 text-xs h-8">
              <CalendarClock className="w-3.5 h-3.5" /> Schedule {format(scheduledDate, 'MMM d')}
            </Button>
          )}
          <MultiPublishButton
            content={content}
            postId={postId}
            selectedPlatforms={[platform]}
            onPublished={onPublished}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlatformPostCard({
  entry, bEntry, abMode, strategy, strategyB,
  scheduledDate, scheduledTime, selectedRoles,
  onEdit, onEditB, onSave, onSaveB, onPublished,
}) {
  const platform = entry.platform;
  const label = PLATFORM_LABELS[platform] || platform;

  // Backend may have returned an error for this platform.
  if (entry.error && !entry.content) {
    return (
      <Card className="p-4 border-destructive/40">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">{label}</span>
          <span className="text-[11px] text-destructive">generation failed</span>
        </div>
        <p className="text-xs text-muted-foreground">{entry.error}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        {entry.postId && <span className="text-[11px] text-emerald-600 font-medium">saved ✓</span>}
      </div>
      <div className={`p-4 ${abMode ? 'grid md:grid-cols-2 gap-5' : ''}`}>
        <VariantEditor
          label={abMode ? `Variant A · ${(strategy || '').replace(/_/g, ' ')}` : null}
          platform={platform}
          content={entry.content}
          postId={entry.postId}
          selectedRoles={selectedRoles}
          onEdit={onEdit}
          onSave={onSave}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          onPublished={onPublished}
        />
        {abMode && bEntry && (
          <VariantEditor
            label={`Variant B · ${(strategyB || '').replace(/_/g, ' ')}`}
            platform={platform}
            content={bEntry.content}
            postId={bEntry.postId}
            selectedRoles={selectedRoles}
            onEdit={onEditB}
            onSave={onSaveB}
            scheduledDate={scheduledDate}
            scheduledTime={scheduledTime}
            onPublished={onPublished}
          />
        )}
      </div>
    </Card>
  );
}
