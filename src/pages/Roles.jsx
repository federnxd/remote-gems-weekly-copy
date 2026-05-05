import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

const categories = ['engineering', 'design', 'content', 'finance_legal', 'science', 'management', 'other'];
const categoryColors = {
  engineering: 'bg-primary/10 text-primary',
  design: 'bg-chart-3/10 text-chart-3',
  content: 'bg-chart-4/10 text-chart-4',
  finance_legal: 'bg-chart-2/10 text-chart-2',
  science: 'bg-accent/10 text-accent',
  management: 'bg-chart-5/10 text-chart-5',
  other: 'bg-muted text-muted-foreground',
};

export default function Roles() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({ title: '', category: 'engineering', priority: 'medium' });
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['open-roles'],
    queryFn: () => base44.entities.OpenRole.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.OpenRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-roles'] });
      setDialogOpen(false);
      setNewRole({ title: '', category: 'engineering', priority: 'medium' });
      toast.success('Role added!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OpenRole.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['open-roles'] });
      toast.success('Role removed');
    },
  });

  const filtered = roles.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Open Roles</h1>
          <p className="text-sm text-muted-foreground">{roles.length} active positions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Role</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Job Title</Label>
                <Input value={newRole.title} onChange={(e) => setNewRole({...newRole, title: e.target.value})} placeholder="e.g. ML Engineer" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newRole.category} onValueChange={(v) => setNewRole({...newRole, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newRole.priority} onValueChange={(v) => setNewRole({...newRole, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => createMutation.mutate(newRole)} disabled={!newRole.title || createMutation.isPending} className="w-full">
                Add Role
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Search roles..." 
          className="pl-10"
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((role) => (
          <Card key={role.id} className="p-4 flex items-center justify-between group">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{role.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="secondary" className={categoryColors[role.category]}>
                  {role.category?.replace(/_/g, ' ')}
                </Badge>
                {role.priority === 'high' && (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                    High Priority
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => deleteMutation.mutate(role.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No roles found. Add your first role to get started.</p>
        </div>
      )}
    </div>
  );
}