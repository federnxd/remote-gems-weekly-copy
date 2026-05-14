import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

// Maps role keywords → recommended platform IDs and rationale
const PLATFORM_RULES = [
  {
    match: (roles, segments) =>
      segments.includes('engineering') || segments.includes('it') ||
      roles.some(r => /engineer|developer|dev|devops|backend|frontend|fullstack|data|ml|ai|cloud|infra/i.test(r)),
    platforms: ['linkedin', 'wellfound', 'remotive', 'reddit_discord'],
    reason: 'Tech roles perform best on LinkedIn, Wellfound (startup talent), Remotive (remote-first devs), and niche Reddit/Discord communities.',
  },
  {
    match: (roles, segments) =>
      segments.includes('management') ||
      roles.some(r => /manager|director|vp|head|lead|executive|coo|cto|ceo|senior/i.test(r)),
    platforms: ['linkedin', 'flexjobs'],
    reason: 'Senior & executive roles: LinkedIn for direct sourcing, FlexJobs for serious high-quality applicants.',
  },
  {
    match: (roles, segments) =>
      segments.includes('design') || segments.includes('creative') ||
      roles.some(r => /design|ux|ui|graphic|visual|creative|brand/i.test(r)),
    platforms: ['linkedin', 'wellfound', 'remoteok', 'reddit_discord'],
    reason: 'Design talent is active on LinkedIn, Wellfound, and creative subreddits/Discord servers.',
  },
  {
    match: (roles, segments) =>
      segments.includes('content') ||
      roles.some(r => /content|copywriter|writer|editor|seo|marketing|social media/i.test(r)),
    platforms: ['linkedin', 'twitter', 'weworkremotely', 'jobspresso'],
    reason: 'Content & marketing pros are on LinkedIn and X/Twitter; job boards like We Work Remotely and Jobspresso curate these roles.',
  },
  {
    match: (roles, segments) =>
      segments.includes('finance_legal') ||
      roles.some(r => /finance|legal|accountant|lawyer|compliance|analyst|controller/i.test(r)),
    platforms: ['linkedin', 'flexjobs'],
    reason: 'Finance & legal talent trusts LinkedIn and vetted boards like FlexJobs for professional credibility.',
  },
  {
    match: (roles, segments) =>
      segments.includes('science') ||
      roles.some(r => /scientist|research|biolog|chemist|lab|medical|clinical/i.test(r)),
    platforms: ['linkedin', 'weworkremotely', 'remotive'],
    reason: 'Science/research roles: LinkedIn for sourcing, We Work Remotely and Remotive for remote-open candidates.',
  },
  {
    match: (roles, segments) =>
      segments.includes('media') ||
      roles.some(r => /media|video|podcast|film|audio|production|journalist/i.test(r)),
    platforms: ['linkedin', 'twitter', 'reddit_discord'],
    reason: 'Media & production pros are heavily active on X/Twitter and niche communities (subreddits, Discord).',
  },
];

const ALL_PLATFORMS = {
  linkedin: { label: 'LinkedIn', color: 'bg-[#0a66c2]' },
  twitter: { label: 'X / Twitter', color: 'bg-black' },
  wellfound: { label: 'Wellfound', color: 'bg-orange-500' },
  remotive: { label: 'Remotive', color: 'bg-violet-500' },
  weworkremotely: { label: 'We Work Remotely', color: 'bg-teal-600' },
  flexjobs: { label: 'FlexJobs', color: 'bg-green-600' },
  remoteok: { label: 'Remote OK', color: 'bg-red-500' },
  jobspresso: { label: 'Jobspresso', color: 'bg-amber-500' },
  reddit_discord: { label: 'Reddit / Discord', color: 'bg-orange-600' },
};

export default function PlatformRecommender({ selectedRoles, activeSegments }) {
  const recommendations = useMemo(() => {
    if (selectedRoles.length === 0 && activeSegments.length === 0) return null;

    const matched = PLATFORM_RULES.filter(rule => rule.match(selectedRoles, activeSegments));
    if (matched.length === 0) return null;

    // Aggregate platforms and pick best reasons
    const platformSet = new Set();
    matched.forEach(r => r.platforms.forEach(p => platformSet.add(p)));
    const topReason = matched[0].reason;

    return { platforms: [...platformSet], reason: topReason };
  }, [selectedRoles, activeSegments]);

  if (!recommendations) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-amber-700">
        <Lightbulb className="w-3.5 h-3.5 shrink-0" />
        <span className="text-xs font-semibold">Recommended Platforms for Your Selection</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recommendations.platforms.map(id => {
          const p = ALL_PLATFORMS[id];
          if (!p) return null;
          return (
            <span key={id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white ${p.color}`}>
              {p.label}
            </span>
          );
        })}
      </div>
      <p className="text-[11px] text-amber-800 leading-relaxed">{recommendations.reason}</p>
    </div>
  );
}