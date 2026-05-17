import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Code2, Briefcase, Mic, Scale, FlaskConical, 
  Palette, BookOpen, Users, Layers, Languages
} from 'lucide-react';

export const SEGMENTS = [
  {
    id: 'it',
    label: 'IT & Engineering',
    icon: Code2,
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20 border-primary/20',
    activeBg: 'bg-primary text-primary-foreground border-primary',
    roles: [
      'ML Engineer', 'Frontend Engineer', 'Full-Stack Developer', 'DevOps Engineer',
      'Python Developer', 'iOS Developer', 'AI Engineer', 'Data Engineer',
      'Data Analytics Specialist', 'Software Engineer', 'Backend Engineer',
    ],
  },
  {
    id: 'business',
    label: 'Business & Finance',
    icon: Briefcase,
    color: 'text-chart-4',
    bg: 'bg-chart-4/10 hover:bg-chart-4/20 border-chart-4/20',
    activeBg: 'bg-chart-4 text-white border-chart-4',
    roles: [
      'Financial Advisor', 'CPA / US Tax Accountant', 'HR Expert', 'Product Manager',
    ],
  },
  {
    id: 'legal',
    label: 'Legal & Compliance',
    icon: Scale,
    color: 'text-chart-3',
    bg: 'bg-chart-3/10 hover:bg-chart-3/20 border-chart-3/20',
    activeBg: 'bg-chart-3 text-white border-chart-3',
    roles: [
      'Attorney / General Counsel', 'Legal Expert',
    ],
  },
  {
    id: 'media',
    label: 'Audio, Video & Media',
    icon: Mic,
    color: 'text-chart-5',
    bg: 'bg-chart-5/10 hover:bg-chart-5/20 border-chart-5/20',
    activeBg: 'bg-chart-5 text-white border-chart-5',
    roles: [
      'Audio Transcription Expert', 'Video Editor', 'Motion Graphics Designer', 'Adobe Specialist',
      'Voice Actors', 'Field Recorders', 'Film Editor',
      'Swiss German Audio Recording Expert', 'Kannada Audio Recording Expert',
      'Malayalam Audio Recording Expert', 'Odia Audio Recording Expert',
      'Crowd Workers — Accents/Dialects', 'Crowd Workers — Bilingual',
    ],
  },
  {
    id: 'creative',
    label: 'Creative & Design',
    icon: Palette,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10 hover:bg-chart-2/20 border-chart-2/20',
    activeBg: 'bg-chart-2 text-white border-chart-2',
    roles: [
      'UX/UI Expert', 'Graphic Designer', 'Brand Designer',
    ],
  },
  {
    id: 'content',
    label: 'Content & Writing',
    icon: BookOpen,
    color: 'text-accent',
    bg: 'bg-accent/10 hover:bg-accent/20 border-accent/20',
    activeBg: 'bg-accent text-accent-foreground border-accent',
    roles: [
      'Writer & Author', 'Journalist', 'Linguistic Expert', 'Philosophy Expert',
    ],
  },
  {
    id: 'science',
    label: 'Science & Healthcare',
    icon: FlaskConical,
    color: 'text-chart-2',
    bg: 'bg-chart-2/10 hover:bg-chart-2/20 border-chart-2/20',
    activeBg: 'bg-chart-2 text-white border-chart-2',
    roles: [
      'Biologist (Cell / Molecular)', 'Healthcare Professional', 'STEM Expert', 'Academic Researcher',
    ],
  },
  {
    id: 'language',
    label: 'Language & Translation',
    icon: Languages,
    color: 'text-violet-600',
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-200',
    activeBg: 'bg-violet-600 text-white border-violet-600',
    roles: [
      'Linguistic Expert', 'Translator', 'Interpreter', 'Localization Expert',
      'Bilingual Expert', 'Multilingual Expert', 'Subtitler', 'Caption Expert',
    ],
  },
  {
    id: 'all',
    label: 'All Roles',
    icon: Layers,
    color: 'text-muted-foreground',
    bg: 'bg-muted hover:bg-muted/80 border-border',
    activeBg: 'bg-foreground text-background border-foreground',
    roles: [],
  },
];

export default function SegmentSelector({ activeSegments, onToggleSegment }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEGMENTS.map((seg) => {
        const isActive = activeSegments.includes(seg.id);
        return (
          <button
            key={seg.id}
            onClick={() => onToggleSegment(seg.id, seg.roles)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
              isActive ? seg.activeBg : seg.bg
            )}
          >
            <seg.icon className={cn("w-3.5 h-3.5", isActive ? "opacity-100" : seg.color)} />
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}