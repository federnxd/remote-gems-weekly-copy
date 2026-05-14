import React from 'react';
import { cn } from '@/lib/utils';

export const PLATFORMS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0a66c2',
    bgActive: 'bg-[#0a66c2]',
    borderActive: 'border-[#0a66c2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    color: '#000000',
    bgActive: 'bg-black',
    borderActive: 'border-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'threads',
    label: 'Threads',
    color: '#101010',
    bgActive: 'bg-[#101010]',
    borderActive: 'border-[#101010]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.028-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.987.038v-.85c0-.573-.2-1.064-.592-1.395-.394-.332-.969-.505-1.713-.505-1.242 0-2.117.48-2.727 1.468l-1.728-1.07c.867-1.467 2.278-2.215 4.07-2.215 1.234 0 2.286.332 3.028.958.745.63 1.14 1.534 1.14 2.613v5.037c.282.065.558.142.824.232 1.374.463 2.407 1.29 2.985 2.574.781 1.79.674 4.485-1.647 6.756-1.713 1.671-3.834 2.476-6.69 2.5zm.137-9.647c-.074 0-.148.002-.222.006-1.08.061-1.96.386-2.554.945-.576.54-.865 1.286-.823 2.102.037.716.38 1.317.969 1.695.635.411 1.469.596 2.343.547 1.157-.063 2.012-.497 2.617-1.33.617-.846.929-2.033.904-3.452a11.63 11.63 0 00-1.234-.513z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877f2',
    bgActive: 'bg-[#1877f2]',
    borderActive: 'border-[#1877f2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
];

export default function PlatformSelector({ selectedPlatforms, onChange }) {
  const toggle = (id) => {
    onChange(
      selectedPlatforms.includes(id)
        ? selectedPlatforms.filter(p => p !== id)
        : [...selectedPlatforms, id]
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map((p) => {
        const active = selectedPlatforms.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-all',
              active
                ? `${p.bgActive} ${p.borderActive} text-white shadow-sm`
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            {p.icon}
            {p.label}
          </button>
        );
      })}
    </div>
  );
}