import React, { useState } from 'react';
import { CheckSquare, Square, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { PLATFORMS } from './PlatformSelector';

const PLATFORM_LINKS = {
  linkedin: { url: 'https://www.linkedin.com/feed/', label: 'Open LinkedIn' },
  twitter: { url: 'https://twitter.com/compose/tweet', label: 'Open X / Twitter' },
  weworkremotely: { url: 'https://weworkremotely.com/post-a-job', label: 'Post on WWR' },
  wellfound: { url: 'https://wellfound.com/jobs', label: 'Post on Wellfound' },
  remotive: { url: 'https://remotive.com/post-a-job', label: 'Post on Remotive' },
  flexjobs: { url: 'https://www.flexjobs.com/employer-services', label: 'Post on FlexJobs' },
  remoteok: { url: 'https://remoteok.com/post-a-job', label: 'Post on Remote OK' },
  reddit: { url: 'https://www.reddit.com/r/remotework/', label: 'Open Reddit' },
  discord: { url: 'https://discord.com/', label: 'Open Discord' },
};

const PLATFORM_TIPS = {
  weworkremotely: 'Copy your post and adapt it as a formal job listing. Emphasize remote perks.',
  wellfound: 'Highlight equity, mission, and stage. Candidates apply directly to founders.',
  remotive: 'Make sure your company has a remote-first culture statement ready.',
  flexjobs: 'FlexJobs reviews listings manually — keep it professional and detailed.',
  remoteok: 'Include salary range for higher visibility. Digital nomad audience appreciates transparency.',
  reddit: 'Post in relevant subreddits (r/remotework, r/forhire, r/cscareerquestions). Be conversational.',
  discord: 'Find relevant servers for your role type. Be a community member first, recruiter second.',
  linkedin: 'Use your personal profile for maximum organic reach. Tag 2-3 relevant people.',
  twitter: 'Thread format works well. Pin the tweet and engage with replies quickly.',
};

export default function WhereToPostChecklist({ selectedPlatforms }) {
  const [checked, setChecked] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  if (!selectedPlatforms || selectedPlatforms.length === 0) return null;

  const platforms = selectedPlatforms
    .map(id => PLATFORMS.find(p => p.id === id))
    .filter(Boolean);

  const toggleCheck = (id) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="flex items-center gap-2">
          📋 Where to Post Checklist
          <span className="text-xs font-normal text-muted-foreground">
            {doneCount}/{platforms.length} done
          </span>
        </span>
        {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {platforms.map((p) => {
            const link = PLATFORM_LINKS[p.id];
            const tip = PLATFORM_TIPS[p.id];
            const done = !!checked[p.id];
            return (
              <div
                key={p.id}
                className={`px-4 py-3 flex items-start gap-3 transition-colors ${done ? 'bg-muted/50 opacity-60' : ''}`}
              >
                <button onClick={() => toggleCheck(p.id)} className="mt-0.5 shrink-0 text-primary">
                  {done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p.label}</span>
                    {link && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        {link.label} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  {tip && <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tip}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}