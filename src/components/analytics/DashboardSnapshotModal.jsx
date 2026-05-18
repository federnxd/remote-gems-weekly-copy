import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ClipboardPaste, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

// ── helpers ──────────────────────────────────────────────────────────────────
function extractNumber(text, ...labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '[:\\s\\n]*([\\d.,]+)', 'i');
    const m = text.match(re);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10) || 0;
    const re2 = new RegExp('([\\d.,]+)\\s*\\n\\s*' + escaped, 'i');
    const m2 = text.match(re2);
    if (m2) return parseInt(m2[1].replace(/[.,]/g, ''), 10) || 0;
  }
  return 0;
}

function extractDollar(text, ...labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped + '[:\\s\\n]*\\$?([\\d.,]+)', 'i');
    const m = text.match(re);
    if (m) return parseFloat(m[1].replace(/,/g, '')) || 0;
    const re2 = new RegExp('\\$([\\d.,]+)\\s*\\n\\s*' + escaped, 'i');
    const m2 = text.match(re2);
    if (m2) return parseFloat(m2[1].replace(/,/g, '')) || 0;
  }
  return 0;
}

function parseMicro1(text) {
  return {
    total_referrals:        extractNumber(text, 'Total referrals'),
    ai_interview_completed: extractNumber(text, 'AI interview completed'),
    minimum_criteria_met:   extractNumber(text, 'Minimum criteria met'),
    certified:              extractNumber(text, 'Certified'),
    matched_to_project:     extractNumber(text, 'Matched to project'),
    successful_referrals:   extractNumber(text, 'Successful referrals'),
    total_cash_earned:      extractDollar(text, 'Total cash earned'),
    available_balance:      extractDollar(text, 'Available balance'),
  };
}

function parseLinkedIn(text) {
  // Try to find any number near each label, with many format variations
  return {
    impressions:      extractNumber(text, 'Impressions', 'Impresiones', 'impression'),
    reach:            extractNumber(text, 'Members reached', 'Miembros alcanzados', 'Reach', 'Unique impressions', 'Unique viewers'),
    profile_views:    extractNumber(text, 'Profile views', 'Visualizaciones del perfil', 'Profile view'),
    followers_gained: extractNumber(text, 'Followers gained', 'Seguidores obtenidos', 'New followers', 'Followers'),
    reactions:        extractNumber(text, 'Reactions', 'Reacciones', 'Likes', 'Like', 'Reaction'),
    comments:         extractNumber(text, 'Comments', 'Comentarios', 'Comment'),
    reposts:          extractNumber(text, 'Reposts', 'Veces compartido', 'Shares', 'Repost', 'Share'),
    saves:            extractNumber(text, 'Saves', 'Veces guardado', 'Save'),
    sends:            extractNumber(text, 'Sends', 'Envíos en LinkedIn', 'Send', 'LinkedIn sends'),
    link_clicks:      extractNumber(text, 'Link clicks', 'Visitas a los enlaces', 'Link interactions', 'Clicks', 'Click', 'External link clicks'),
  };
}

// ── field definitions ────────────────────────────────────────────────────────
const FUNNEL_FIELDS = [
  { key: 'total_referrals',        label: 'Total Referrals' },
  { key: 'ai_interview_completed', label: 'AI Interview Completed' },
  { key: 'minimum_criteria_met',   label: 'Minimum Criteria Met' },
  { key: 'certified',              label: 'Certified' },
  { key: 'matched_to_project',     label: 'Matched to Project' },
  { key: 'successful_referrals',   label: 'Successful Referrals' },
];
const EARNINGS_FIELDS = [
  { key: 'total_cash_earned', label: 'Total Cash Earned ($)', step: '0.01' },
  { key: 'available_balance', label: 'Available Balance ($)',  step: '0.01' },
];
const LINKEDIN_FIELDS = [
  { key: 'impressions',      label: 'Impressions' },
  { key: 'reach',            label: 'Members Reached' },
  { key: 'profile_views',    label: 'Profile Views' },
  { key: 'followers_gained', label: 'Followers Gained' },
  { key: 'reactions',        label: 'Reactions' },
  { key: 'comments',         label: 'Comments' },
  { key: 'reposts',          label: 'Reposts' },
  { key: 'saves',            label: 'Saves' },
  { key: 'sends',            label: 'Sends' },
  { key: 'link_clicks',      label: 'Link Clicks' },
];

// ── sub-component: paste panel ───────────────────────────────────────────────
function PastePanel({ title, color, placeholder, value, onChange, onParse, parsed }) {
  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${parsed ? 'border-green-400/60 bg-green-50/40' : 'border-border bg-muted/20'}`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</p>
        {parsed && <CheckCircle2 className="w-4 h-4 text-green-500" />}
      </div>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-28 font-mono text-xs resize-none"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onParse}
        disabled={!value.trim()}
        className="w-full gap-2"
      >
        <ClipboardPaste className="w-3.5 h-3.5" />
        Extract {title} Data
      </Button>
    </div>
  );
}

// ── main modal ───────────────────────────────────────────────────────────────
export default function DashboardSnapshotModal({ open, onClose, onSaved }) {
  const [micro1Paste, setMicro1Paste] = useState('');
  const [linkedInPaste, setLinkedInPaste] = useState('');
  const [micro1Parsed, setMicro1Parsed] = useState(null);
  const [linkedInParsed, setLinkedInParsed] = useState(null);
  const [notes, setNotes] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleParseMicro1 = () => {
    setMicro1Parsed(parseMicro1(micro1Paste));
    toast.success('micro1 data extracted!');
  };

  const handleParseLinkedIn = () => {
    setLinkedInParsed(parseLinkedIn(linkedInPaste));
    toast.success('LinkedIn data extracted!');
  };

  const updateMicro1Field = (key, val) =>
    setMicro1Parsed(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  const updateLinkedInField = (key, val) =>
    setLinkedInParsed(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  const canSave = micro1Parsed || linkedInParsed;

  const handleSave = async () => {
    if (!canSave) { toast.error('Extract at least one section first'); return; }
    setSaving(true);
    await base44.entities.CompanyDashboardSnapshot.create({
      snapshot_date: snapshotDate,
      raw_paste: [micro1Paste, linkedInPaste].filter(Boolean).join('\n\n---\n\n'),
      ...(micro1Parsed || {}),
      ...(linkedInParsed || {}),
      notes,
    });
    toast.success('Snapshot saved!');
    setSaving(false);
    setMicro1Paste(''); setLinkedInPaste('');
    setMicro1Parsed(null); setLinkedInParsed(null);
    setNotes('');
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-primary" />
            Paste Dashboard Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Date */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Snapshot Date</Label>
            <Input type="date" value={snapshotDate} onChange={e => setSnapshotDate(e.target.value)} className="w-44" />
          </div>

          {/* Two paste areas side by side */}
          <div className="grid sm:grid-cols-2 gap-4">
            <PastePanel
              title="micro1 Dashboard"
              color="text-orange-600"
              placeholder={"Total referrals\n248\nAI interview completed\n58\nCertified\n12\n..."}
              value={micro1Paste}
              onChange={setMicro1Paste}
              onParse={handleParseMicro1}
              parsed={micro1Parsed}
            />
            <PastePanel
              title="LinkedIn Analytics"
              color="text-primary"
              placeholder={"Impressions\n4,200\nMembers reached\n3,100\nReactions\n87\n..."}
              value={linkedInPaste}
              onChange={setLinkedInPaste}
              onParse={handleParseLinkedIn}
              parsed={linkedInParsed}
            />
          </div>

          {/* Extracted fields review */}
          {(micro1Parsed || linkedInParsed) && (
            <div className="space-y-4 border rounded-xl p-4 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extracted — edit if needed</p>

              {micro1Parsed && (
                <>
                  <div>
                    <p className="text-xs font-semibold mb-2 text-orange-600">Referral Funnel</p>
                    <div className="grid grid-cols-2 gap-3">
                      {FUNNEL_FIELDS.map(({ key, label }) => (
                        <div key={key}>
                          <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                          <Input type="number" value={micro1Parsed[key]} onChange={e => updateMicro1Field(key, e.target.value)} className="h-8 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-2 text-orange-600">Earnings</p>
                    <div className="grid grid-cols-2 gap-3">
                      {EARNINGS_FIELDS.map(({ key, label, step }) => (
                        <div key={key}>
                          <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                          <Input type="number" step={step} value={micro1Parsed[key]} onChange={e => updateMicro1Field(key, e.target.value)} className="h-8 text-sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {linkedInParsed && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-primary">LinkedIn Analytics</p>
                  <div className="grid grid-cols-2 gap-3">
                    {LINKEDIN_FIELDS.map(({ key, label }) => (
                      <div key={key}>
                        <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                        <Input type="number" value={linkedInParsed[key]} onChange={e => updateLinkedInField(key, e.target.value)} className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context..." className="h-8 text-sm" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}