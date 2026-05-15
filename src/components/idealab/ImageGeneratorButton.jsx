import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ImagePlus, Download, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

// Strategy-specific visual direction for micro1 brand
const STRATEGY_VISUAL = {
  targeted_role: {
    format: 'LinkedIn infographic',
    style: 'clean corporate tech, dark navy (#0A1628) background, electric blue (#2563EB) accents, white text, bold role title centered, micro1 logo space at top-right',
    mood: 'professional, authoritative, specific',
  },
  storytelling: {
    format: 'LinkedIn story card',
    style: 'warm gradient from deep navy (#0A1628) to indigo (#4F46E5), white text, subtle human silhouette or abstract person icon, micro1 wordmark at bottom',
    mood: 'personal, warm, trustworthy',
  },
  urgency: {
    format: 'LinkedIn announcement banner',
    style: 'bold red-orange gradient (#DC2626 to #EA580C) on dark navy, large countdown/alert icon, white bold text, high contrast, micro1 logo top-left',
    mood: 'urgent, high-energy, action-driven',
  },
  social_proof: {
    format: 'LinkedIn testimonial card',
    style: 'clean white background with navy (#0A1628) header band, green success accents (#16A34A), quote marks, star icons, micro1 branding in header',
    mood: 'credible, reassuring, evidence-based',
  },
  niche_community: {
    format: 'LinkedIn community post header',
    style: 'gradient from teal (#0D9488) to navy (#0A1628), community/network icons, white text, niche role category highlighted in yellow pill badge, micro1 logo',
    mood: 'inclusive, expert, community-focused',
  },
  carousel_text: {
    format: 'LinkedIn carousel slide 1 cover',
    style: 'bold split layout: left half dark navy (#0A1628) with headline text, right half electric blue (#2563EB) with numbered list preview, micro1 logo and swipe arrow at bottom',
    mood: 'educational, structured, scroll-stopping',
  },
};

function buildImagePrompt(idea) {
  const visual = STRATEGY_VISUAL[idea.strategy] || STRATEGY_VISUAL.storytelling;
  const titleSnippet = idea.title.slice(0, 60);

  return `Create a professional ${visual.format} image for LinkedIn social media.

BRAND: micro1 — an AI talent platform connecting professionals with top AI companies globally.
BRAND COLORS: Primary dark navy #0A1628, electric blue #2563EB, white text, green accent #16A34A.
BRAND FEEL: Modern, trustworthy, premium tech company. Clean and minimal.

POST TOPIC: "${titleSnippet}"
STRATEGY TYPE: ${idea.strategy.replace(/_/g, ' ')}

VISUAL STYLE: ${visual.style}
MOOD: ${visual.mood}

REQUIREMENTS:
- LinkedIn post image dimensions (1:1 or 1.91:1 ratio)  
- Include placeholder text: "micro1" as the brand name, visible but subtle
- Main headline area should have space for: "${titleSnippet.substring(0, 40)}…"
- NO real logos — just styled "micro1" text as wordmark
- High contrast, readable text areas, professional LinkedIn aesthetic
- Clean layout with clear visual hierarchy
- No clipart or cartoon style — sleek and corporate

Generate a stunning, eye-catching visual that a professional would be proud to post on LinkedIn.`;
}

export default function ImageGeneratorButton({ idea }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    if (!open) setOpen(true);
    const prompt = buildImagePrompt(idea);
    const result = await base44.integrations.Core.GenerateImage({ prompt });
    setImageUrl(result.url);
    setIsGenerating(false);
  };

  const handleRegenerate = async () => {
    setImageUrl(null);
    setIsGenerating(true);
    const prompt = buildImagePrompt(idea);
    const result = await base44.integrations.Core.GenerateImage({ prompt });
    setImageUrl(result.url);
    setIsGenerating(false);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `micro1-${idea.strategy}-${Date.now()}.png`;
    a.target = '_blank';
    a.click();
    toast.success('Image opened for download');
  };

  const strategyLabel = (idea.strategy || '').replace(/_/g, ' ');

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating image…</>
        ) : imageUrl ? (
          <><RefreshCw className="w-3.5 h-3.5" /> Regenerate Visual</>
        ) : (
          <><ImagePlus className="w-3.5 h-3.5" /> Generate Visual</>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ImagePlus className="w-4 h-4 text-primary" />
              Branded Visual — <span className="capitalize text-muted-foreground">{strategyLabel}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Post title context */}
            <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
              {idea.title}
            </p>

            {/* Image area */}
            <div className="rounded-xl border bg-muted/20 overflow-hidden aspect-square flex items-center justify-center min-h-[280px]">
              {isGenerating && (
                <div className="flex flex-col items-center gap-3 text-center px-6">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm font-medium">Creating your branded visual…</p>
                  <p className="text-xs text-muted-foreground">Applying micro1 brand guidelines and {strategyLabel} style</p>
                </div>
              )}
              {!isGenerating && imageUrl && (
                <img
                  src={imageUrl}
                  alt={`Branded visual for ${idea.title}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Actions */}
            {imageUrl && !isGenerating && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleRegenerate}>
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
                <Button size="sm" className="flex-1 gap-2" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Generated with micro1 brand colors · {strategyLabel} style · Optimized for LinkedIn
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}