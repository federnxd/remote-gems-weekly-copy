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

// Tries to extract a number following a label in the pasted text
function extractNumber(text, ...labels) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // number immediately after label (same line or next line)
    const re = new RegExp(escaped + '[:\\s\\n]*([\\d.,]+)', 'i');
    const m = text.match(re);
    if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10) || 0;
    // number on the line BEFORE the label
    const re2 = new RegExp('([\\d.,]+)\\s*\\n\\s*' + escaped, 'i');
    const m2 = text.match(re2);
    if (m2) return parseInt(m2[1].replace(/[.,]/g, ''), 10) || 0;
  }
  return 0;
}

function parseLinkedInPaste(text) {
  return {
    impressions:    extractNumber(text, 'Impresiones', 'Impressions'),
    reach:          extractNumber(text, 'Miembros alcanzados', 'Members reached', 'Reach'),
    profile_views:  extractNumber(text, 'Visualizaciones del perfil', 'Profile views'),
    followers_gained: extractNumber(text, 'Seguidores obtenidos', 'Followers gained', 'New followers'),
    reactions:      extractNumber(text, 'Reacciones', 'Reactions', 'Likes'),
    comments:       extractNumber(text, 'Comentarios', 'Comments'),
    reposts:        extractNumber(text, 'Veces compartido', 'Reposts', 'Shares'),
    saves:          extractNumber(text, 'Veces guardado', 'Saves'),
    sends:          extractNumber(text, 'Envíos en LinkedIn', 'Sends'),
    link_clicks:    extractNumber(text, 'Visitas a los enlaces', 'Link clicks', 'Interacciones con el enlace', 'Link interactions'),
  };
}

export default function DashboardSnapshotModal({ open, onClose, onSaved }) {
  const [paste, setPaste] = useState('');
  const [parsed, setParsed] = useState(null);
  const [referrals, setReferrals] = useState('');
  const [notes, setNotes] = useState('');
  const [snapshotDate, setSnapshotDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);

  const handleParse = () => {
    const result = parseLinkedInPaste(paste);
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
      referrals: parseInt(referrals) || 0,
      notes,
    });
    toast.success('Snapshot saved!');
    setSaving(false);
    setPaste(''); setParsed(null); setReferrals(''); setNotes('');
    onSaved?.();
    onClose();
  };

  const fields = parsed ? [
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
  ] : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-primary" />
            Paste LinkedIn Dashboard Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Snapshot Date</Label>
            <Input type="date" value={snapshotDate} onChange={e => setSnapshotDate(e.target.value)} />
          </div>

          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Paste LinkedIn Analytics Text
              <span className="font-normal text-muted-foreground ml-1">(copy all text from your dashboard)</span>
            </Label>
            <Textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              placeholder="Paste the raw text from your LinkedIn analytics page here..."
              className="h-36 font-mono text-xs"
            />
          </div>

          <Button variant="outline" onClick={handleParse} disabled={!paste.trim()} className="w-full gap-2">
            <ClipboardPaste className="w-4 h-4" />
            Extract Numbers
          </Button>

          {parsed && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Extracted — edit if needed</p>
              <div className="grid grid-cols-2 gap-3">
                {fields.map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
                    <Input
                      type="number"
                      value={parsed[key]}
                      onChange={e => setParsed(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Actual Referrals <span className="text-primary">(manual)</span></Label>
                  <Input
                    type="number"
                    value={referrals}
                    onChange={e => setReferrals(e.target.value)}
                    placeholder="e.g. 31"
                    className="h-8 text-sm"
                  />
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