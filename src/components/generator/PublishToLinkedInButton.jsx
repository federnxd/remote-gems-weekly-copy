import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Linkedin, Loader2, CheckCircle2, Paperclip, X, ImageIcon, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PublishToLinkedInButton({ content, postId, onPublished, disabled }) {
  const [open, setOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { file, preview }
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      toast.error('Only images (JPG, PNG, GIF, WebP) and PDFs are supported.');
      return;
    }

    setAttachedFile({ file, preview: isImage ? URL.createObjectURL(file) : null });
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeAttachment = () => {
    if (attachedFile?.preview) URL.revokeObjectURL(attachedFile.preview);
    setAttachedFile(null);
  };

  const handleOpen = () => {
    setOpen(true);
    setPublished(false);
  };

  const handleClose = () => {
    if (!isPublishing) {
      setOpen(false);
      removeAttachment();
    }
  };

  const handleConfirm = async () => {
    setIsPublishing(true);

    let fileUrl = null;
    let fileName = null;
    let fileType = null;

    if (attachedFile) {
      setIsUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: attachedFile.file });
      setIsUploading(false);
      fileUrl = file_url;
      fileName = attachedFile.file.name;
      fileType = attachedFile.file.type;
    }

    const res = await base44.functions.invoke('publishToLinkedIn', {
      postContent: content,
      postId: postId || null,
      fileUrl,
      fileName,
      fileType,
    });

    setIsPublishing(false);

    if (res.data?.success) {
      setPublished(true);
      toast.success('Post published to LinkedIn!');
      onPublished?.();
      setTimeout(() => {
        setOpen(false);
        setPublished(false);
        removeAttachment();
      }, 1500);
    } else {
      toast.error(res.data?.error || 'Failed to publish. Please try again.');
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        disabled={disabled || !content}
        className="gap-1.5 text-xs bg-[#0a66c2] hover:bg-[#004182] text-white"
      >
        <Linkedin className="w-3.5 h-3.5" />
        Publish to LinkedIn
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-[#0a66c2]" />
              Publish to LinkedIn
            </DialogTitle>
            <DialogDescription>
              This will publish the post immediately to your LinkedIn profile as a public post.
            </DialogDescription>
          </DialogHeader>

          {/* Post preview snippet */}
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground max-h-28 overflow-y-auto whitespace-pre-wrap border">
            {content?.slice(0, 300)}{content?.length > 300 ? '…' : ''}
          </div>

          {/* Attachment area */}
          <div className="space-y-2">
            {attachedFile ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/40">
                {attachedFile.preview ? (
                  <img src={attachedFile.preview} alt="preview" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachedFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">{(attachedFile.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={removeAttachment} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-2 p-3 border border-dashed rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
                Attach image or PDF (optional)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isPublishing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPublishing || published}
              className="bg-[#0a66c2] hover:bg-[#004182] text-white gap-2"
            >
              {isPublishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isUploading ? 'Uploading…' : 'Publishing…'}</>
              ) : published ? (
                <><CheckCircle2 className="w-4 h-4" /> Published!</>
              ) : (
                <><Linkedin className="w-4 h-4" /> Publish Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}