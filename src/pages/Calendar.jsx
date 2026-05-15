import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Trash2, GripVertical, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import AutoFillCalendarButton from '@/components/calendar/AutoFillCalendarButton';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import CalendarInsightsPanel from '@/components/calendar/CalendarInsightsPanel';

const strategyColors = {
  targeted_role: 'bg-primary text-primary-foreground',
  storytelling: 'bg-chart-3/80 text-white',
  urgency: 'bg-destructive/80 text-white',
  social_proof: 'bg-chart-2/80 text-white',
  niche_community: 'bg-chart-4/80 text-white',
  carousel_text: 'bg-accent/80 text-accent-foreground',
};

const statusDot = {
  draft: 'bg-muted-foreground',
  scheduled: 'bg-primary',
  published: 'bg-chart-2',
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ['generated-posts'],
    queryFn: () => base44.entities.GeneratedPost.list('-created_date'),
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['dashboard-snapshots-all'],
    queryFn: () => base44.entities.CompanyDashboardSnapshot.list('snapshot_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.GeneratedPost.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['generated-posts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.GeneratedPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      setSelectedPost(null);
      toast.success('Post deleted');
    },
  });

  const scheduledPosts = posts.filter(p => p.scheduled_date);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startPadding = getDay(days[0]);

  const getPostsForDay = (day) =>
    scheduledPosts.filter(p => {
      try { return isSameDay(parseISO(p.scheduled_date), day); } catch { return false; }
    });

  const monthPosts = scheduledPosts.filter(p => {
    try {
      const d = parseISO(p.scheduled_date);
      return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
    } catch { return false; }
  });

  const publishedCount = monthPosts.filter(p => p.status === 'published').length;
  const scheduledCount = monthPosts.filter(p => p.status === 'scheduled').length;

  const onDragStart = (start) => setDraggingId(start.draggableId);

  const onDragEnd = (result) => {
    setDraggingId(null);
    if (!result.destination) return;
    const { droppableId: destId } = result.destination;
    const postId = result.draggableId;
    if (destId === result.source.droppableId) return;

    // destId is ISO date string "yyyy-MM-dd"
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (destId === 'unscheduled') {
      updateMutation.mutate({ id: postId, data: { scheduled_date: null, status: 'draft' } });
    } else {
      updateMutation.mutate({
        id: postId,
        data: {
          scheduled_date: destId,
          status: post.status === 'draft' ? 'scheduled' : post.status,
        },
      });
    }
    toast.success(destId === 'unscheduled' ? 'Moved back to unscheduled' : `Rescheduled to ${format(parseISO(destId), 'MMM d')}`);
  };

  const markPublished = (post) => {
    updateMutation.mutate({ id: post.id, data: { status: 'published' } });
    setSelectedPost(null);
    toast.success('Marked as published');
  };

  // Unscheduled sidebar posts (drafts OR unscheduled posts with no date)
  const unscheduled = posts.filter(p => !p.scheduled_date && (p.status === 'draft' || p.status === 'scheduled'));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Content Calendar</h1>
          <Badge variant="secondary" className="bg-chart-2/10 text-chart-2">{publishedCount} Published</Badge>
          <Badge variant="secondary" className="bg-primary/10 text-primary">{scheduledCount} Scheduled</Badge>
        </div>
        <div className="flex items-center gap-2">
          <AutoFillCalendarButton
            currentMonth={currentMonth}
            onPostsCreated={() => queryClient.invalidateQueries({ queryKey: ['generated-posts'] })}
          />
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-semibold w-36 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} className="text-xs ml-2">
            Today
          </Button>
        </div>
      </div>

      <CalendarInsightsPanel posts={posts} snapshots={snapshots} />

      <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex flex-1 overflow-hidden">

          {/* Unscheduled sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unscheduled Drafts</p>
                <Link to="/generator" title="Create new post">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Drag onto calendar to schedule</p>
            </div>
            <Droppable droppableId="unscheduled">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'flex-1 overflow-y-auto p-2 space-y-1.5 transition-colors',
                    snapshot.isDraggingOver && 'bg-primary/5'
                  )}
                >
                  {unscheduled.length === 0 && (
                    <div className="text-center mt-4 px-2 space-y-2">
                      <p className="text-[11px] text-muted-foreground">No unscheduled drafts</p>
                      <Link to="/generator" className="text-[11px] text-primary hover:underline flex items-center justify-center gap-1">
                        <Plus className="w-3 h-3" /> Generate a post
                      </Link>
                    </div>
                  )}
                  {unscheduled.map((post, index) => (
                    <Draggable key={post.id} draggableId={post.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setSelectedPost(post)}
                          className={cn(
                            'text-[11px] rounded-md px-2 py-1.5 cursor-grab active:cursor-grabbing border border-border bg-card flex items-start gap-1.5 group transition-shadow',
                            snapshot.isDragging && 'shadow-lg ring-2 ring-primary/30'
                          )}
                        >
                          <GripVertical className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0 opacity-50 group-hover:opacity-100" />
                          <div className="min-w-0">
                            <div className={cn('w-1.5 h-1.5 rounded-full mt-1 mb-0.5 flex-shrink-0 inline-block mr-1', statusDot[post.status])} />
                            <span className="font-medium text-foreground line-clamp-2">{post.title}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border bg-card sticky top-0 z-10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-r border-border last:border-r-0">
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            <div className="grid grid-cols-7" style={{ minHeight: '100%' }}>
              {/* Padding cells */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="border-r border-b border-border min-h-[120px] bg-muted/10" />
              ))}

              {days.map(day => {
                const dayPosts = getPostsForDay(day);
                const today = isToday(day);
                const dateKey = format(day, 'yyyy-MM-dd');

                return (
                  <Droppable key={dateKey} droppableId={dateKey}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'min-h-[120px] border-r border-b border-border p-1.5 transition-colors relative',
                          today && 'bg-primary/5',
                          snapshot.isDraggingOver && 'bg-blue-50 dark:bg-blue-950/30 ring-inset ring-2 ring-primary/40'
                        )}
                      >
                        {/* Day number */}
                        <div className={cn(
                          'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                          today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        )}>
                          {format(day, 'd')}
                        </div>

                        {/* Posts */}
                        <div className="space-y-0.5">
                          {dayPosts.slice(0, 3).map((post, index) => (
                            <Draggable key={post.id} draggableId={post.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={(e) => { e.stopPropagation(); setSelectedPost(post); }}
                                  className={cn(
                                    'text-[10px] rounded px-1.5 py-0.5 truncate cursor-grab active:cursor-grabbing font-medium flex items-center gap-1',
                                    strategyColors[post.strategy] || 'bg-muted text-muted-foreground',
                                    post.status === 'published' && 'opacity-60',
                                    snapshot.isDragging && 'shadow-lg opacity-90 ring-1 ring-white/30'
                                  )}
                                >
                                  {post.status === 'published' ? '✓ ' : post.scheduled_time ? `${post.scheduled_time} ` : ''}
                                  <span className="truncate">{post.title}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {dayPosts.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayPosts.length - 3} more</div>
                          )}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}

              {/* Fill remaining cells to complete the last week row */}
              {(() => {
                const totalCells = startPadding + days.length;
                const remainder = totalCells % 7;
                if (remainder === 0) return null;
                return Array.from({ length: 7 - remainder }).map((_, i) => (
                  <div key={`tail-${i}`} className="border-r border-b border-border min-h-[120px] bg-muted/10" />
                ));
              })()}
            </div>
          </div>
        </div>
      </DragDropContext>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-2 border-t border-border bg-card flex-shrink-0">
        {Object.entries(strategyColors).map(([key, cls]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('w-2.5 h-2.5 rounded', cls)} />
            <span className="text-[11px] text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div className="ml-auto text-[11px] text-muted-foreground italic">Drag posts to reschedule</div>
      </div>

      {/* Post Detail Dialog */}
      {selectedPost && (
        <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', statusDot[selectedPost.status])} />
                {selectedPost.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge className={strategyColors[selectedPost.strategy]}>{selectedPost.strategy?.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className="capitalize">{selectedPost.status}</Badge>
                {selectedPost.scheduled_date && (
                  <span className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    {selectedPost.scheduled_date}{selectedPost.scheduled_time ? ` @ ${selectedPost.scheduled_time}` : ''}
                  </span>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-52 overflow-y-auto">
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
                <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(selectedPost.id)} disabled={deleteMutation.isPending}>
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