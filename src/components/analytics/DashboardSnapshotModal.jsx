import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ClipboardPaste } from 'lucide-react';
import { format } from 'date-fns';

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

function parsePaste(text) {
  return {
    // Referral funnel fields (micro1 dashboard)
    total_referrals:       extractNumber(text, 'Total referrals'),
    ai_interview_completed: extractNumber(text, 'AI interview completed'),
    minimum_criteria_met:  extractNumber(text, 'Minimum criteria met'),
    certified:             extractNumber(text, 'Certified'),
    matched_to_project:    extractNumber(text, 'Matched to project'),
    successful_referrals:  extractNumber(text, 'Successful referrals'),
    total_cash_earned:     extractDollar(text, 'Total cash earned'),
    available_balance:     extractDollar(text, 'Available balance'),
    // LinkedIn analytics fields
    impressions:           extractNumber(text, 'Impressions', 'Impresiones'),
    reach:                 extractNumber(text, 'Members reached', 'Miembros alcanzados', 'Reach'),
    profile_views:         extractNumber(text, 'Profile views', 'Visualizaciones del perfil'),
    followers_gained:      extractNumber(text, 'Followers gained', 'Seguidores obtenidos', 'New followers'),
    reactions:             extractNumber(text, 'Reactions', 'Reacciones', 'Likes'),
    comments:              extractNumber(text, 'Comments', 'Comentarios'),
    reposts:               extractNumber(text, 'Reposts', 'Veces compartido', 'Shares'),
    saves:                 extractNumber(text, 'Saves', 'Veces guardado'),
    sends:                 extractNumber(text, 'Sends', 'Envíos en LinkedIn'),
    link_clicks:           extractNumber(text, 'Link clicks', 'Visitas a los enlaces', 'Link interactions'),
  };
}

const FUNNEL_FIELDS = [
  { key: 'total_referrals', label: 'Total Referrals' },
  { key: 'ai_interview_completed', label: 'AI Interview Completed' },
  { key: 'minimum_criteria_met', label: 'Minimum Criteria Met' },
  { key: 'certified', label: 'Certified' },
  { key: 'matched_to_project', label: 'Matched to Project' },
  { key: 'successful_referrals', label: 'Successful Referrals' },
];

const EARNINGS_FIELDS = [
  { key: 'total_cash_earned', label: 'Total Cash Earned ($)', isDollar: true },
  { key: 'available_balance', label: 'Available Balance ($)', isDollar: true },
];

const LINKEDIN_FIELDS = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'reach', label: 'Members Reached' },
  { key: 'profile_views', label: 'Profile Views' },
  { key: 'followers_gained', label: 'Followers Gained' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'comments', label: 'Comments' },
  { key: 'reposts', label: 'Reposts' },
  { key: 'saves', label: 'Saves' },
  { key: 'sends', label: 'Sends' },
  { key: 'link_clicks', label: 'Link Clicks' },
];

export default function DashboardSnapshotModal({ open, onClose, onSaved }) {
  const [paste, setPaste] = useState('');
  const [parsed, setParsed] = useState(null);
  const [notes, setNotes] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleParse = () => {
    const result = parsePaste(paste);
    setParsed(result);
    toast.success('Data extracted — review and adjust below before saving.');
  };

  const handleSave = async () => {
    if (!parsed) { toast.error('Parse the data first'); return; }
    setSaving(true);
    await base44.entities.CompanyDashboardSnapshot.create({
      snapshot_date: snapshotDate,
      raw_paste: paste,
      ...parsed,
      notes,
    });
    toast.success('Snapshot saved!');
    setSaving(false);
    setPaste(''); setParsed(null); setNotes('');
    onSaved?.();
    onClose();
  };

  const updateField = (key, val) =>
    setParsed(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-primary" />
            Paste Dashboard Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Snapshot Date</Label>
            <Input type="date" value={snapshotDate} onChange={e => setSnapshotDate(e.target.value)} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Paste your dashboard text
              <span className="font-normal text-muted-foreground ml-1">(works for micro1 referral dashboard + LinkedIn analytics)</span>
            </Label>
            <Textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              placeholder={"Total referrals\n248\nAI interview completed\n58\n..."}
              className="h-36 font-mono text-xs"
            />
          </div>

          <Button variant="outline" onClick={handleParse} disabled={!paste.trim()} className="w-full gap-2">
            <ClipboardPaste className="w-4 h-4" />
            Extract Numbers
          </Button>

          {parsed && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extracted — edit if needed</p>

              <div>
                <p className="text-xs font-semibold mb-2 text-foreground">Referral Funnel</p>
                <div className="grid grid-cols-2 gap-3">
                  {FUNNEL_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                      <Input type="number" value={parsed[key]} onChange={e => updateField(key, e.target.value)} className="h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 text-foreground">Earnings</p>
                <div className="grid grid-cols-2 gap-3">
                  {EARNINGS_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                      <Input type="number" step="0.01" value={parsed[key]} onChange={e => updateField(key, e.target.value)} className="h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold mb-2 text-foreground">LinkedIn Analytics</p>
                <div className="grid grid-cols-2 gap-3">
                  {LINKEDIN_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                      <Input type="number" value={parsed[key]} onChange={e => updateField(key, e.target.value)} className="h-8 text-sm" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context..." className="h-8 text-sm" />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!parsed || saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}