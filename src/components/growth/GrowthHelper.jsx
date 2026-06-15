import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Copy, MessageSquareReply, FileText, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const MODES = [
  { key: 'reply', label: 'Reply helper', icon: MessageSquareReply, blurb: 'Paste a post or comment — get 3 genuine reply options.' },
  { key: 'outline', label: 'Post outline', icon: FileText, blurb: 'Give a topic — get a structure and hooks to write your own post.' },
  { key: 'advice', label: 'Writing advice', icon: Lightbulb, blurb: 'Ask how to approach a topic on this platform.' },
];

function CopyBtn({ text }) {
  return (
    <Button
      variant="ghost" size="sm"
      className="h-7 gap-1 text-xs text-muted-foreground"
      onClick={async () => { await navigator.clipboard.writeText(text); toast.success('Copied'); }}
    >
      <Copy className="w-3 h-3" /> Copy
    </Button>
  );
}

export default function GrowthHelper({ platform, platformLabel }) {
  const [mode, setMode] = useState('reply');
  const [source, setSource] = useState('');
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState(''); // intent / angle / question depending on mode
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (mode === 'reply' && !source.trim()) { toast.error('Paste the post or comment to reply to'); return; }
    if ((mode === 'outline' || mode === 'advice') && !topic.trim()) { toast.error('Enter a topic'); return; }
    setLoading(true);
    setResult(null);
    try {
      const payload = { mode, platform };
      if (mode === 'reply') { payload.source = source; payload.intent = extra; }
      else if (mode === 'outline') { payload.topic = topic; payload.angle = extra; }
      else { payload.topic = topic; payload.question = extra; }

      const res = await base44.functions.invoke('growthHelper', payload);
      const data = res?.data ?? res ?? {};
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      toast.error('Helper failed: ' + (err?.message || 'error'));
    }
    setLoading(false);
  };

  const activeMode = MODES.find(m => m.key === mode);

  return (
    <Card className="p-4 sticky top-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Growth Helper</h3>
          <p className="text-[11px] text-muted-foreground">Helping you with {platformLabel}</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-1 mb-3">
        {MODES.map(m => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              onClick={() => { setMode(m.key); setResult(null); }}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-[11px] font-medium transition-colors ${
                mode === m.key ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-4 h-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mb-2">{activeMode.blurb}</p>

      {/* Inputs */}
      {mode === 'reply' ? (
        <>
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Paste the post or comment you want to reply to…"
            className="min-h-[90px] text-sm mb-2"
          />
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Optional: what do you want to convey?"
            className="text-sm mb-2"
          />
        </>
      ) : (
        <>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. why domain experts matter in AI)"
            className="text-sm mb-2"
          />
          <Input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={mode === 'outline' ? 'Optional: your angle / point of view' : 'Optional: a specific question'}
            className="text-sm mb-2"
          />
        </>
      )}

      <Button onClick={run} disabled={loading} className="w-full gap-2" size="sm">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Thinking…' : 'Get suggestions'}
      </Button>

      {/* Results */}
      {result && (
        <div className="mt-4 space-y-3">
          {mode === 'reply' && Array.isArray(result.replies) && result.replies.map((r, i) => (
            <div key={i} className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">{r.type}</span>
                <CopyBtn text={r.text} />
              </div>
              <p className="text-sm leading-relaxed">{r.text}</p>
            </div>
          ))}

          {mode === 'outline' && (
            <div className="space-y-3 text-sm">
              {result.hook_options?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Hook options</p>
                  {result.hook_options.map((h, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 border-l-2 border-primary/30 pl-2 py-1">
                      <span className="leading-snug">{h}</span><CopyBtn text={h} />
                    </div>
                  ))}
                </div>
              )}
              {result.structure && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Structure</p>
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{result.structure}</p>
                </div>
              )}
              {result.key_points?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Key points</p>
                  <ul className="list-disc pl-4 space-y-0.5">{result.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </div>
              )}
              {result.closing_options?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Closing options</p>
                  <ul className="list-disc pl-4 space-y-0.5">{result.closing_options.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              )}
              {result.tone_notes && <p className="text-xs text-muted-foreground italic">{result.tone_notes}</p>}
              {result.what_to_avoid?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-destructive uppercase mb-1">Avoid</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{result.what_to_avoid.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {mode === 'advice' && (
            <div className="space-y-3 text-sm">
              {result.core_advice && (
                <div className="border-l-2 border-primary/40 pl-2">
                  <p className="leading-relaxed">{result.core_advice}</p>
                </div>
              )}
              {result.do_this?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase mb-1">Do this</p>
                  <ul className="list-disc pl-4 space-y-0.5">{result.do_this.map((d, i) => <li key={i}>{d}</li>)}</ul>
                </div>
              )}
              {result.avoid_this?.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-destructive uppercase mb-1">Avoid this</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">{result.avoid_this.map((a, i) => <li key={i}>{a}</li>)}</ul>
                </div>
              )}
              {result.example_hook && (
                <div className="border rounded-lg p-2.5 bg-muted/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-primary">Example hook</span>
                    <CopyBtn text={result.example_hook} />
                  </div>
                  <p className="leading-relaxed">{result.example_hook}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
