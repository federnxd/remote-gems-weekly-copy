import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, MessageSquare, Users, Target, Clock, 
  TrendingUp, Share2, BookOpen, CheckCircle2, Star
} from 'lucide-react';

const playbook = [
  {
    title: "The #1 Mistake: Posting for Everyone",
    icon: Target,
    color: "text-destructive",
    content: `Your model post lists 30+ roles. This is actually counterproductive. When someone sees 30 roles, they think "this isn't for me specifically" and scroll past.

**FIX:** Create separate posts targeting 1-3 related roles. A Frontend Engineer post should speak ONLY to frontend developers, using their language, their pain points, their keywords.`,
    priority: "critical"
  },
  {
    title: "Hook Engineering: The First 2 Lines",
    icon: Zap,
    color: "text-chart-4",
    content: `LinkedIn shows only 2 lines before "...see more". Your current hook "May - Remote Opportunities at Leading AI Company" is informational, not compelling.

**HIGH-CONVERTING PROFESSIONAL HOOKS:**
• "The AI industry is reshaping how top professionals work — and remote is now the standard."
• "micro1 is quietly becoming one of the most respected AI companies to work with remotely. Here's why."
• "If you're a [role] looking to apply your expertise to cutting-edge AI projects — fully remote — this is worth reading."
• "What does it look like to work with a leading AI company from anywhere in the world? I've been doing it since October 2025."
• "Remote + AI + flexible hours + expert-level work. This combination exists — and it's at micro1."
• "Are you a [role] who values autonomy, flexible hours, and working on AI that matters? Read this."`,
    priority: "critical"
  },
  {
    title: "Post Frequency: 4-5x/Week Minimum",
    icon: Clock,
    color: "text-primary",
    content: `Top referrers (367 hired/month) post 1-2x DAILY across multiple strategies. Your posting cadence should be:

• **Mon/Wed/Fri 8AM:** Targeted role posts
• **Tue/Thu 12PM:** Engagement posts (polls, questions, stories)  
• **Sat 10AM:** Weekend boost post (paid)
• **Daily:** 30 min engaging with others' posts, commenting, DM outreach`,
    priority: "high"
  },
  {
    title: "DM Strategy: The Real Conversion Engine",
    icon: MessageSquare,
    color: "text-chart-3",
    content: `Posts create awareness. DMs create conversions. The 367-hired champion likely DMs 50-100 people daily.

**DM TEMPLATE:**
"Hey [name], I saw you're a [role] at [company]. I've been working at micro1 (AI training company) and they're urgently hiring [role]s — fully remote, flexible hours, great pay. Would you be interested? I can share my referral link."

**WHO TO DM:**
• People who liked/commented on your posts
• 2nd connections in target roles
• People posting about job hunting  
• Members of relevant LinkedIn groups`,
    priority: "critical"
  },
  {
    title: "LinkedIn Groups: Untapped Gold Mine",
    icon: Users,
    color: "text-accent",
    content: `Join 20-30 groups related to your target roles:
• "Remote Work Opportunities"
• "Python Developers"
• "Frontend Engineers"
• "AI & Machine Learning Professionals"
• "Freelance Writers"
• "Legal Professionals Network"

**Post in 3-5 groups daily** (different post variants to avoid spam detection). Group posts reach people OUTSIDE your network.`,
    priority: "high"
  },
  {
    title: "The Follow-Up System",
    icon: TrendingUp,
    color: "text-chart-2",
    content: `Your funnel drops from 100 referrals → 20 interviews (80% dropout!). The fix is systematic follow-up:

**Day 0:** They click your link
**Day 1:** DM them: "Hey! Saw you applied through my link 🙌 Let me know if you have any questions about the interview"
**Day 3:** If no interview: "Quick reminder — check your spam folder for the interview invite! It's a 30-min call, totally worth it"
**Day 7:** "Still interested? I can help you prep for the interview if needed"

This alone could double your interview rate.`,
    priority: "critical"
  },
  {
    title: "Content Mix Formula",
    icon: BookOpen,
    color: "text-chart-4",
    content: `**The winning content mix (per week):**
• 2x Targeted role posts (different roles each week)
• 1x Personal story/result post
• 1x Social proof post (screenshot of pay, team messages)
• 1x Urgency/FOMO post ("only X spots left this month")
• 1x Engagement post (poll or question)

**NEVER repeat the same post.** LinkedIn's algorithm penalizes repetitive content.`,
    priority: "high"
  },
  {
    title: "Boost Strategy: $5/Post Sweet Spot",
    icon: Share2,
    color: "text-primary",
    content: `With $20/month for boosting, target your BEST performing organic posts:

**Targeting:**
• Job titles matching the role
• "Open to work" badge users
• Geographic targeting: US, UK, India, Philippines (high pass rates)
• Interest-based: relevant skills and tools

**Boost only posts that already have good organic engagement** (100+ likes in first 2 hours). This signals quality to LinkedIn's algorithm.`,
    priority: "medium"
  },
];

export default function Playbook() {
  const priorityColors = {
    critical: 'bg-destructive/10 text-destructive',
    high: 'bg-chart-4/10 text-chart-4',
    medium: 'bg-primary/10 text-primary',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Playbook</h1>
        <p className="text-sm text-muted-foreground">Proven strategies to go from 1 hired to 100+ per month</p>
      </div>

      {/* Key Insight */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Star className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">The Key Insight</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Your competitor with 367 hires isn't just posting — they're running a <strong>system</strong>. 
              The difference is: targeted posts + massive DM outreach + systematic follow-ups + group posting. 
              Posts alone won't get you there. You need a multi-channel, high-volume approach.
            </p>
          </div>
        </div>
      </Card>

      {/* Playbook Cards */}
      <div className="space-y-4">
        {playbook.map((item, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <h3 className="font-semibold">{item.title}</h3>
              </div>
              <Badge variant="secondary" className={priorityColors[item.priority]}>
                {item.priority}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pl-[52px]">
              {item.content.split('**').map((part, j) => 
                j % 2 === 0 ? part : <strong key={j} className="text-foreground">{part}</strong>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}