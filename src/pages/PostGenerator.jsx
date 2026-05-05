import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StrategySelector from '@/components/generator/StrategySelector';
import RoleSelector from '@/components/generator/RoleSelector';
import PostPreview from '@/components/generator/PostPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function PostGenerator() {
  const [strategy, setStrategy] = useState('');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [referralLink, setReferralLink] = useState('https://lnkd.in/gZXXSdt4');
  const [personalNote, setPersonalNote] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['open-roles'],
    queryFn: () => base44.entities.OpenRole.filter({ is_active: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.GeneratedPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-posts'] });
      toast.success('Post saved!');
    },
  });

  const toggleRole = (title) => {
    setSelectedRoles(prev => 
      prev.includes(title) ? prev.filter(r => r !== title) : [...prev, title]
    );
  };

  const handleGenerate = async () => {
    if (!strategy) {
      toast.error('Please select a post strategy');
      return;
    }

    setIsGenerating(true);
    const rolesList = selectedRoles.length > 0 ? selectedRoles : roles.map(r => r.title);
    
    const prompt = `You are an expert LinkedIn content strategist specializing in referral recruitment. Generate a high-converting LinkedIn post for micro1 (an AI training and development company) that maximizes referral sign-ups.

STRATEGY: ${strategy.replace(/_/g, ' ')}
REFERRAL LINK: ${referralLink}
TARGET ROLES: ${rolesList.join(', ')}
${personalNote ? `PERSONAL NOTE TO INCLUDE: ${personalNote}` : ''}

CRITICAL OPTIMIZATION RULES (based on data analysis):
- The post reached 390,000 impressions but only 100 referrals, 20 interviews, 10 met criteria, 9 certified, 1 hired.
- We need to 10x the referral-to-hired conversion. The benchmark is 367 hired/month by top performers.
- KEY PROBLEMS TO SOLVE:
  1. Most people scroll past → Need a POWERFUL hook in the first 2 lines
  2. Too general → Each post should target 1-3 specific roles maximum for targeted engagement
  3. No clear CTA → Need ONE clear, specific call-to-action
  4. No urgency → Add scarcity/urgency elements
  5. No social proof specifics → Include concrete numbers/results
  6. The post is too long → Keep it concise and scannable

FORMAT RULES:
- Start with an ATTENTION-GRABBING hook (question, bold claim, or surprising stat)
- Use emojis strategically (not excessively)
- Break text into short, scannable paragraphs
- Include the referral link naturally
- End with 5-8 highly relevant hashtags
- Keep under 1,500 characters for better engagement
- For "targeted_role" strategy: Focus on ONLY the selected roles, speak their language
- For "storytelling": Share a genuine personal experience that resonates
- For "urgency": Create FOMO with specific deadlines or limited spots
- For "social_proof": Highlight specific achievements, pay, flexibility
- For "niche_community": Use industry-specific language and references
- For "carousel_text": Create a structured, shareable list format

TONE: Professional but approachable. Authentic, not salesy. Like a friend sharing a great opportunity.

Generate ONLY the post content, no explanations.`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setGeneratedContent(result);
    setIsGenerating(false);
  };

  const handleSave = () => {
    saveMutation.mutate({
      title: `${strategy.replace(/_/g, ' ')} - ${selectedRoles.slice(0, 3).join(', ') || 'All roles'}`,
      content: generatedContent,
      strategy,
      target_roles: selectedRoles.join(', '),
      status: 'draft',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post Generator</h1>
        <p className="text-sm text-muted-foreground">Create AI-optimized LinkedIn posts for maximum referrals</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div>
            <Label className="text-sm font-semibold mb-3 block">1. Choose Strategy</Label>
            <StrategySelector selected={strategy} onSelect={setStrategy} />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-3 block">
              2. Target Roles 
              <span className="font-normal text-muted-foreground ml-1">(optional — targets all if empty)</span>
            </Label>
            <RoleSelector roles={roles} selectedRoles={selectedRoles} onToggle={toggleRole} />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">3. Referral Link</Label>
            <Input 
              value={referralLink} 
              onChange={(e) => setReferralLink(e.target.value)}
              placeholder="Your referral link"
            />
          </div>

          <div>
            <Label className="text-sm font-semibold mb-2 block">
              4. Personal Touch 
              <span className="font-normal text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Any specific personal experience, numbers, or angle you want included..."
              className="h-20"
            />
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full gap-2 h-12 text-base"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Post
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <PostPreview 
            content={generatedContent}
            onSave={handleSave}
            onRegenerate={handleGenerate}
            isSaving={saveMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}