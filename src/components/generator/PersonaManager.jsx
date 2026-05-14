import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookmarkPlus, ChevronDown, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';

export default function PersonaManager({ selectedRoles, activeSegments, onApplyPersona }) {
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: personas = [] } = useQuery({
    queryKey: ['personas'],
    queryFn: () => base44.entities.Persona.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Persona.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setSaveName('');
      setSaveDesc('');
      setSaveOpen(false);
      toast.success('Persona saved!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Persona.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      toast.success('Persona deleted');
    },
  });

  const handleSave = () => {
    if (!saveName.trim()) return toast.error('Give the persona a name');
    if (selectedRoles.length === 0) return toast.error('Select at least one role first');
    createMutation.mutate({
      name: saveName.trim(),
      description: saveDesc.trim(),
      roles: selectedRoles,
      segments: activeSegments,
    });
  };

  const handleApply = (persona) => {
    onApplyPersona(persona.roles, persona.segments || []);
    setLoadOpen(false);
    toast.success(`Applied persona: ${persona.name}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Load Persona */}
      <Popover open={loadOpen} onOpenChange={setLoadOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <User className="w-3.5 h-3.5" />
            Load Persona
            <ChevronDown className="w-3 h-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {personas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No saved personas yet. Select roles and save one!</p>
          ) : (
            <div className="space-y-1">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted cursor-pointer group"
                  onClick={() => handleApply(p)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{p.roles.length} role{p.roles.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(p.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Save Persona */}
      <Popover open={saveOpen} onOpenChange={setSaveOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save Persona
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <p className="text-sm font-semibold mb-2">Save Current Selection</p>
          {selectedRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedRoles.slice(0, 4).map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
              ))}
              {selectedRoles.length > 4 && (
                <Badge variant="secondary" className="text-xs">+{selectedRoles.length - 4} more</Badge>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">No roles selected yet.</p>
          )}
          <div className="space-y-2">
            <Input
              placeholder="Persona name *"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="text-sm h-8"
            />
            <Input
              placeholder="Description (optional)"
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              className="text-sm h-8"
            />
            <Button
              size="sm"
              className="w-full"
              onClick={handleSave}
              disabled={createMutation.isPending}
            >
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}