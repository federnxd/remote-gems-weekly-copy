import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Target, BookOpen, Clock, Award, Users, Layout, Sparkles } from 'lucide-react';

const strategies = [
  { 
    id: 'targeted_role', 
    icon: Target, 
    label: 'Targeted Role', 
    desc: 'Focus on 1-3 specific roles to reach the right audience',
    tip: 'Best for niche roles'
  },
  { 
    id: 'storytelling', 
    icon: BookOpen, 
    label: 'Personal Story', 
    desc: 'Share your experience at micro1 to build trust',
    tip: 'Highest engagement'
  },
  { 
    id: 'urgency', 
    icon: Clock, 
    label: 'Urgency/FOMO', 
    desc: 'Create urgency with limited spots or deadlines',
    tip: 'Drives quick action'
  },
  { 
    id: 'social_proof', 
    icon: Award, 
    label: 'Social Proof', 
    desc: 'Highlight success stories and certifications',
    tip: 'Builds credibility'
  },
  { 
    id: 'niche_community', 
    icon: Users, 
    label: 'Niche Community', 
    desc: 'Target specific professional communities',
    tip: 'Higher conversion'
  },
  { 
    id: 'carousel_text', 
    icon: Layout, 
    label: 'Carousel/List', 
    desc: 'Structured format great for sharing multiple roles',
    tip: 'High shareability'
  },
  { 
    id: 'new_roles_spotlight', 
    icon: Sparkles, 
    label: '🆕 New Roles', 
    desc: 'Spotlight freshly added roles from your selected audience',
    tip: 'Timely & relevant',
    highlight: true,
  },
];

export default function StrategySelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {strategies.map((s) => (
        <Card
          key={s.id}
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md",
            selected === s.id 
              ? "ring-2 ring-primary bg-primary/5" 
              : "hover:bg-muted/50",
            s.highlight && selected !== s.id && "border-amber-300 bg-amber-50/50"
          )}
          onClick={() => onSelect(s.id)}
        >
          <s.icon className={cn("w-5 h-5 mb-2", selected === s.id ? "text-primary" : "text-muted-foreground")} />
          <p className="text-sm font-semibold">{s.label}</p>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.desc}</p>
          <span className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {s.tip}
          </span>
        </Card>
      ))}
    </div>
  );
}