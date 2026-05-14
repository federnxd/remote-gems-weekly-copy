import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Send, Paperclip, X, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { PLATFORMS } from './PlatformSelector';
import { cn } from '@/lib/utils';

const STATUS_ICON = {
  idle: null,
  pending: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  error: <XCircle className="w-4 h-4 text-destructive" />,
};

export default function MultiPublishButton({ content, postId, selectedPlatforms, onPublished, disabled }) {
  const [open, setOpen] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);

  const activePlatforms = PLATFORMS.filter(p => selectedPlatforms.includes(p.id));
  const done = Object.keys(statuses).length > 0 && !isPublishing;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) { toast.error('Only images and PDFs are supported.'); return; }
    setAttachedFile({ file, preview: isImage ? URL.createObjectURL(file) : null });
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
    setAttachedFile(null);
  };

  const handleOpen = () => {
    setStatuses({});
    setOpen(true);
  };

  const handleClose = () => {
    if (!isPublishing) { setOpen(false); removeAttachment(); }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    // Set all to pending
    const pending = {};
    activePlatforms.forEach(p => { pending[p.id] = 'pending'; });
    setStatuses(pending);

    let fileUrl = null, fileName = null, fileType = null;
    if (attachedFile) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile.file });
      fileUrl = file_url;
      fileName = attachedFile.file.name;
      fileType = attachedFile.file.type;
    }

    const res = await base44.functions.invoke('publishToSocialMedia', {
      postContent: content,
      postId: postId || null,
      platforms: activePlatforms.map(p => p.id),
      fileUrl, fileName, fileType,
    });

    const results = res.data?.results || {};
    const newStatuses = {};
    activePlatforms.forEach(p => {
      newStatuses[p.id] = results[p.id]?.success ? 'success' : 'error';
    });
    setStatuses(newStatuses);
    setIsPublishing(false);

    const successCount = Object.values(newStatuses).filter(s => s === 'success').length;
    if (successCount > 0) {
      toast.success(`Published to ${successCount} platform${successCount > 1 ? 's' : ''}!`);
      onPublished?.();
    }
    if (successCount < activePlatforms.length) {
      const failed = activePlatforms.filter(p => newStatuses[p.id] === 'error').map(p => p.label);
      toast.error(`Failed: ${failed.join(', ')}. Check your API credentials in settings.`);
    }
  };

  if (activePlatforms.length === 0) return null;

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        disabled={disabled || !content}
        className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white"
      >
        <Send className="w-3.5 h-3.5" />
        Publish ({activePlatforms.length})
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Publish to {activePlatforms.length} Platform{activePlatforms.length > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              This will publish your post immediately to all selected platforms.
            </DialogDescription>
          </DialogHeader>

          {/* Post preview */}
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground max-h-24 overflow-y-auto whitespace-pre-wrap border text-xs">
            {content?.slice(0, 280)}{content?.length > 280 ? '…' : ''}
          </div>

          {/* Platform status list */}
          <div className="space-y-2">
            {activePlatforms.map((p) => {
              const status = statuses[p.id] || 'idle';
              return (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.icon}
                  </div>
                  <span className="flex-1 text-sm font-medium">{p.label}</span>
                  <div className="w-5 flex items-center justify-center">
                    {STATUS_ICON[status]}
                    {status === 'idle' && <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* LinkedIn attachment (only if linkedin is selected) */}
          {selectedPlatforms.includes('linkedin') && !done && (
            <div className="space-y-2">
              {attachedFile ? (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
                  {attachedFile.preview ? (
                    <img src={attachedFile.preview} alt="preview" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{attachedFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">{(attachedFile.file.size / 1024).toFixed(0)} KB · LinkedIn only</p>
                  </div>
                  <button onClick={removeAttachment} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 p-2.5 border border-dashed rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Attach image or PDF to LinkedIn post (optional)
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
              {done ? 'Close' : 'Cancel'}
            </Button>
            {!done && (
              <Button onClick={handlePublish} disabled={isPublishing} className="gap-2">
                {isPublishing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
                  : <><Send className="w-4 h-4" /> Publish Now</>
                }
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}