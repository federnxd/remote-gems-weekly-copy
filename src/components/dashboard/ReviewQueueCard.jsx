import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Shows posts that are scheduled but marked needs_review. The scheduler skips
// them until the user approves (clears the flag) or deletes.
export default function ReviewQueueCard() {
  const queryClient = useQueryClient();
  const { data: posts = [] } = useQuery({
    queryKey: ['posts-awaiting-review'],
    queryFn: () => base44.entities.GeneratedPost.filter({ status: 'scheduled', needs_review: true }),
  });

  if (posts.length === 0) return null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['posts-awaiting-review'] });
    queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
  };

  const approve = async (post) => {
    try {
      await base44.entities.GeneratedPost.update(post.id, { needs_review: false });
      toast.success(`Approved — "${post.title}" will publish on schedule`);
      invalidate();
    } catch (e) {
      toast.error('Approve failed: ' + (e.message || 'error'));
    }
  };

  const discard = async (post) => {
    try {
      await base44.entities.GeneratedPost.update(post.id, { status: 'draft', needs_review: false });
      toast.success('Moved back to drafts');
      invalidate();
    } catch (e) {
      toast.error('Discard failed: ' + (e.message || 'error'));
    }
  };

  return (
    <Card className="border-orange-200">
      <div className="px-4 py-3 border-b border-orange-100 bg-orange-50/50 flex items-center gap-2">
        <Eye className="w-4 h-4 text-orange-600" />
        <span className="text-sm font-semibold">Review queue</span>
        <span className="text-xs text-muted-foreground">
          {posts.length} post{posts.length === 1 ? '' : 's'} held until you approve
        </span>
      </div>
      <div className="divide-y">
        {posts.slice(0, 5).map((p) => {
          const platformMatch = (p.notes || '').match(/platform:(\S+)/);
          const platform = platformMatch ? platformMatch[1] : 'unknown';
          return (
            <div key={p.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{platform}</span>
                  <span>·</span>
                  <span>{p.scheduled_date} {p.scheduled_time || ''}</span>
                </div>
                <p className="text-sm line-clamp-2 leading-snug">{p.content}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button size="sm" className="gap-1.5 text-xs h-7" onClick={() => approve(p)}>
                  <Check className="w-3.5 h-3.5" /> Approve
                </Button>
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 text-muted-foreground" onClick={() => discard(p)}>
                  <Trash2 className="w-3.5 h-3.5" /> Discard
                </Button>
              </div>
            </div>
          );
        })}
        {posts.length > 5 && (
          <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">
            +{posts.length - 5} more held — manage from the Calendar
          </div>
        )}
      </div>
    </Card>
  );
}
