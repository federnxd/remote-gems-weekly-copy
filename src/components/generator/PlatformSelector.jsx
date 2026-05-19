import React from 'react';
import { cn } from '@/lib/utils';

export const PLATFORMS = [
  // --- Social / Auto-publish ---
  {
    id: 'linkedin',
    label: 'LinkedIn',
    group: 'social',
    tone: 'Professional, insightful, story-driven. Use industry language. 3,000 char limit.',
    color: '#0a66c2',
    bgActive: 'bg-[#0a66c2]',
    borderActive: 'border-[#0a66c2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    group: 'social',
    tone: 'Friendly, community-focused, conversational. Use emojis, keep it engaging and shareable. Great for job announcements and community building.',
    color: '#1877f2',
    bgActive: 'bg-[#1877f2]',
    borderActive: 'border-[#1877f2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    group: 'community',
    tone: 'Punchy, real-time, hashtag-driven. Max 280 characters. Hook immediately, no fluff.',
    color: '#000000',
    bgActive: 'bg-black',
    borderActive: 'border-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },

  {
    id: 'instagram',
    label: 'Instagram',
    group: 'social',
    tone: 'Visual-first, warm and inspiring. Use line breaks and emojis for readability. Strong call to action at the end.',
    color: '#e1306c',
    bgActive: 'bg-[#e1306c]',
    borderActive: 'border-[#e1306c]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  // --- Job Boards (copy-paste targets) ---
  {
    id: 'weworkremotely',
    label: 'We Work Remotely',
    group: 'jobboard',
    tone: 'Remote-first, flexible work focus. Emphasize async culture and global team. Keep concise and scannable.',
    color: '#17a672',
    bgActive: 'bg-[#17a672]',
    borderActive: 'border-[#17a672]',
    icon: <span className="text-[10px] font-bold">WWR</span>,
  },
  {
    id: 'wellfound',
    label: 'Wellfound',
    group: 'jobboard',
    tone: 'Startup-oriented, founder-to-candidate feel. Emphasize equity, mission, growth stage, and impact.',
    color: '#f5631a',
    bgActive: 'bg-[#f5631a]',
    borderActive: 'border-[#f5631a]',
    icon: <span className="text-[10px] font-bold">WF</span>,
  },
  {
    id: 'remotive',
    label: 'Remotive',
    group: 'jobboard',
    tone: 'Community-driven, curated. Speak to remote work lifestyle and company values. Tech-forward language.',
    color: '#7c3aed',
    bgActive: 'bg-violet-600',
    borderActive: 'border-violet-600',
    icon: <span className="text-[10px] font-bold">RM</span>,
  },
  {
    id: 'flexjobs',
    label: 'FlexJobs',
    group: 'jobboard',
    tone: 'Professional, vetted, serious tone. Attract career-focused professionals. Emphasize legitimacy and benefits.',
    color: '#16a34a',
    bgActive: 'bg-green-600',
    borderActive: 'border-green-600',
    icon: <span className="text-[10px] font-bold">FJ</span>,
  },
  {
    id: 'remoteok',
    label: 'Remote OK',
    group: 'jobboard',
    tone: 'Digital nomad audience. Highlight location freedom, pay transparency, and remote-first perks.',
    color: '#ef4444',
    bgActive: 'bg-red-500',
    borderActive: 'border-red-500',
    icon: <span className="text-[10px] font-bold">ROK</span>,
  },
  // --- Community (copy-paste targets) ---
  {
    id: 'reddit',
    label: 'Reddit',
    group: 'community',
    tone: 'Conversational, no-BS, community-first. Do NOT sound like an ad. Share value first, then the opportunity.',
    color: '#ff4500',
    bgActive: 'bg-[#ff4500]',
    borderActive: 'border-[#ff4500]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
      </svg>
    ),
  },
  {
    id: 'discord',
    label: 'Discord',
    group: 'community',
    tone: 'Ultra-casual, direct, community-insider tone. Short messages. Use emojis. Feel like a real person, not a recruiter.',
    color: '#5865f2',
    bgActive: 'bg-[#5865f2]',
    borderActive: 'border-[#5865f2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
      </svg>
    ),
  },
];

const GROUP_LABELS = {
  social: 'Social Media',
  jobboard: 'Job Boards',
  community: 'Communities',
};

export default function PlatformSelector({ selectedPlatforms, onChange }) {
  const toggle = (id) => {
    onChange(
      selectedPlatforms.includes(id)
        ? selectedPlatforms.filter(p => p !== id)
        : [...selectedPlatforms, id]
    );
  };

  const groups = ['social', 'jobboard', 'community'];

  return (
    <div className="space-y-3">
      {groups.map(group => {
        const groupPlatforms = PLATFORMS.filter(p => p.group === group);
        return (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {GROUP_LABELS[group]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {groupPlatforms.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    title={p.tone}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-all',
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
          </div>
        );
      })}
    </div>
  );
}