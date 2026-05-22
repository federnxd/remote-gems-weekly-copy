import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Linkedin, ClipboardPaste } from 'lucide-react';
import LinkedInEngagement from '@/components/dashboard/LinkedInEngagement';
import LinkedInOverallStats from '@/components/dashboard/LinkedInOverallStats';
import DashboardSnapshotModal from '@/components/analytics/DashboardSnapshotModal';

export default function LinkedInDashboard() {
  const queryClient = useQueryClient();
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const publishedPosts = posts.filter(p => p.status === 'published' && p.linkedin_post_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0a66c2]/10 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-[#0a66c2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LinkedIn Dashboard</h1>
            <p className="text-sm text-muted-foreground">{publishedPosts.length} published posts</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowSnapshotModal(true)}>
          <ClipboardPaste className="w-4 h-4" /> Paste Analytics
        </Button>
      </div>

      <DashboardSnapshotModal
        open={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-snapshots'] });
          queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
        }}
      />

      {/* Profile-level analytics (from manual paste) */}
      <LinkedInOverallStats onPasteClick={() => setShowSnapshotModal(true)} />

      {/* Per-post engagement (auto-synced from LinkedIn API) */}
      <LinkedInEngagement posts={posts} />
    </div>
  );
}