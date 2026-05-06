import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

const strategyColors = {
  targeted_role: 'bg-primary text-primary-foreground',
  storytelling: 'bg-chart-3/80 text-white',
  urgency: 'bg-destructive/80 text-white',
  social_proof: 'bg-chart-2/80 text-white',
  niche_community: 'bg-chart-4/80 text-white',
  carousel_text: 'bg-accent/80 text-white',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GeneratedPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success('Post updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GeneratedPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      setSelectedPost(null);
      toast.success('Post removed');
    },
  });

  const scheduledPosts = posts.filter(p => p.scheduled_date);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = getDay(days[0]);

  const getPostsForDay = (day) =>
    scheduledPosts.filter(p => {
      try { return isSameDay(parseISO(p.scheduled_date), day); } catch { return false; }
    });

  const markPublished = (post) => {
    updateMutation.mutate({ id: post.id, data: { status: 'published' } });
    setSelectedPost(null);
  };

  // Summary counts
  const monthPosts = scheduledPosts.filter(p => {
    try { return isSameMonth(parseISO(p.scheduled_date), currentMonth); } catch { return false; }
  });
  const publishedCount = monthPosts.filter(p => p.status === 'published').length;
  const scheduledCount = monthPosts.filter(p => p.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground">Plan and track your LinkedIn posting schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-chart-2/10 text-chart-2">{publishedCount} Published</Badge>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{scheduledCount} Scheduled</Badge>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startPadding }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map(day => {
            const dayPosts = getPostsForDay(day);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] rounded-lg p-1.5 border transition-colors ${
                  today ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 2).map(post => (
                    <div
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`text-[10px] rounded px-1 py-0.5 truncate cursor-pointer font-medium ${strategyColors[post.strategy] || 'bg-muted text-muted-foreground'} ${post.status === 'published' ? 'opacity-60' : ''}`}
                    >
                      {post.status === 'published' ? '✓ ' : ''}{post.title}
                    </div>
                  ))}
                  {dayPosts.length > 2 && (
                    <div className="text-[10px] text-muted-foreground px-1">+{dayPosts.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(strategyColors).map(([key, cls]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${cls}`} />
            <span className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>

      {/* Post Detail Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedPost.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Badge className={strategyColors[selectedPost.strategy]}>{selectedPost.strategy?.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline">{selectedPost.status}</Badge>
                {selectedPost.scheduled_date && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedPost.scheduled_date} {selectedPost.scheduled_time && `@ ${selectedPost.scheduled_time}`}
                  </span>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {selectedPost.content}
              </div>
              {selectedPost.target_roles && (
                <p className="text-xs text-muted-foreground"><strong>Targets:</strong> {selectedPost.target_roles}</p>
              )}
              <div className="flex gap-2">
                {selectedPost.status !== 'published' && (
                  <Button onClick={() => markPublished(selectedPost)} className="flex-1" size="sm">
                    Mark as Published
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(selectedPost.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}