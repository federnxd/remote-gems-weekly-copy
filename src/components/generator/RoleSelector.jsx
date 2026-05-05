import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function RoleSelector({ roles, selectedRoles, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const isSelected = selectedRoles.includes(role.title);
        return (
          <Badge
            key={role.id}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all text-xs py-1.5 px-3",
              isSelected 
                ? "bg-primary hover:bg-primary/90" 
                : "hover:bg-muted"
            )}
            onClick={() => onToggle(role.title)}
          >
            {role.title}
          </Badge>
        );
      })}
    </div>
  );
}