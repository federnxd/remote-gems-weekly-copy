import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Linkedin, Loader2, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PublishToLinkedInButton({ content, postId, onPublished, disabled }) {
  const [open, setOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const handleConfirm = async () => {
    setIsPublishing(true);
    const res = await base44.functions.invoke('publishToLinkedIn', {
      postContent: content,
      postId: postId || null,
    });

    setIsPublishing(false);

    if (res.data?.success) {
      setPublished(true);
      toast.success('Post published to LinkedIn!');
      onPublished?.();
      setTimeout(() => {
        setOpen(false);
        setPublished(false);
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
        onClick={() => setOpen(true)}
        disabled={disabled || !content}
        className="gap-1.5 text-xs bg-[#0a66c2] hover:bg-[#004182] text-white"
      >
        <Linkedin className="w-3.5 h-3.5" />
        Publish to LinkedIn
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Linkedin className="w-5 h-5 text-[#0a66c2]" />
              Publish to LinkedIn
            </DialogTitle>
            <DialogDescription>
              This will publish the post immediately to your LinkedIn profile as a public post. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>

          {/* Post preview snippet */}
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground max-h-32 overflow-y-auto whitespace-pre-wrap border">
            {content?.slice(0, 300)}{content?.length > 300 ? '…' : ''}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPublishing}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPublishing || published}
              className="bg-[#0a66c2] hover:bg-[#004182] text-white gap-2"
            >
              {isPublishing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
              ) : published ? (
                <><CheckCircle2 className="w-4 h-4" /> Published!</>
              ) : (
                <><Linkedin className="w-4 h-4" /> Yes, Publish Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}