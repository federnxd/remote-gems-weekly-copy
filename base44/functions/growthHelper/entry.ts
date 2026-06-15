import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ============================================================
// growthHelper — AI assistance for the Daily Growth checklist.
//
// Modes:
//   - 'reply':   suggest 3 thoughtful, on-platform reply variants to a comment
//                or post the user pastes. Goal: real conversation, not flattery.
//   - 'outline': produce a post outline/model on a given topic for a platform.
//   - 'advice':  give concrete what-to-write / how-to-write guidance on a topic.
//
// Style guarantee: never produces inauthentic engagement bait. Replies are
// substantive and platform-appropriate, not "Great post! 🔥🔥🔥" filler.
// ============================================================

const PLATFORM_TONES = {
  linkedin: 'Professional, thoughtful, substantive. Industry-savvy. Long-form is OK on LinkedIn — replies can be 2–4 sentences.',
  twitter: 'Concise and punchy. Replies should be 1–2 short sentences. Direct, conversational, no fluff.',
  facebook: 'Friendly, warm, slightly informal. 1–3 sentences. Personal touch is welcome.',
  instagram: 'Warm, visual-thinking, conversational. Emojis where they add meaning, not as filler. 1–3 sentences.',
  mastodon: 'Open-source-community tone. Authentic, curious, no marketing voice. Hashtags belong here. 2–4 sentences fine.',
  bluesky: 'Tech-savvy, slightly irreverent, honest. Short and substantive. Bluesky users dislike performative replies.',
  threads: 'Casual, conversational, Instagram-adjacent. 1–3 sentences. Light tone OK.',
};

const PLATFORM_LIMITS = {
  linkedin: 1200, twitter: 280, facebook: 500, instagram: 500,
  mastodon: 500, bluesky: 300, threads: 500,
};

function buildReplyPrompt({ platform, source, intent }) {
  const tone = PLATFORM_TONES[platform] || 'Authentic and human.';
  const limit = PLATFORM_LIMITS[platform] || 500;
  return `You help a real person craft GENUINE replies to social media posts/comments on ${platform.toUpperCase()}.

Their goal: build real relationships and have authentic conversations — NOT to look engaged or game algorithms.

PLATFORM TONE: ${tone}
REPLY LENGTH BUDGET: ${Math.floor(limit * 0.6)} characters max per reply.

THE POST OR COMMENT THEY WANT TO REPLY TO:
"""
${source}
"""

${intent ? `WHAT THEY WANT TO CONVEY: ${intent}\n` : ''}
Give them 3 distinct reply options:
  1. A QUESTION reply — asks a thoughtful follow-up question that shows you engaged with the substance.
  2. An EXPERIENCE reply — shares a relevant personal experience or observation in 1-3 sentences.
  3. A PERSPECTIVE reply — respectfully offers a different angle or adds nuance.

ABSOLUTE RULES:
- NO "Great post!" / "💯💯💯" / "This is fire" / "Love this" openers. EVER.
- NO empty validation. Every reply must add something real to the conversation.
- NO emoji spam. Use emojis only where they carry meaning, not as decoration.
- NO selling. NO referral links. NO recruitment pitches. NO "we're hiring".
- Reference SPECIFIC content from the post — not generic platitudes.
- Sound like a thoughtful human, not a marketer.

Return ONLY a JSON object with this shape (no markdown, no prose around it):
{
  "replies": [
    { "type": "question", "text": "..." },
    { "type": "experience", "text": "..." },
    { "type": "perspective", "text": "..." }
  ]
}`;
}

function buildOutlinePrompt({ platform, topic, angle }) {
  const tone = PLATFORM_TONES[platform] || 'Authentic and engaging.';
  return `You help a real person plan a social media post for ${platform.toUpperCase()} on the topic below.

This is for OUTLINING — not the final post. Give them a model and structure they can adapt in their own voice.

PLATFORM TONE: ${tone}
TOPIC: ${topic}
${angle ? `THEIR ANGLE / POINT OF VIEW: ${angle}\n` : ''}

Return ONLY a JSON object with this shape (no markdown, no prose around it):
{
  "hook_options": ["3 distinct opening-line options that would grab attention on this platform"],
  "structure": "A 3-5 step structural outline of what the post should cover, in order",
  "key_points": ["3-5 concrete points to make"],
  "closing_options": ["2 options for how to end — question, invitation, or call to reflect"],
  "tone_notes": "1-2 sentences of platform-specific tone guidance",
  "what_to_avoid": ["2-3 specific things NOT to do — clichés, overused phrases, traps"]
}

Avoid: corporate-speak, "thrilled to announce", "honored to share", fake humility, recruitment pitches, referral links.`;
}

function buildAdvicePrompt({ platform, topic, question }) {
  const tone = PLATFORM_TONES[platform] || 'Authentic and engaging.';
  return `You give writing advice for ${platform.toUpperCase()} posts. Practical, specific, not platitudes.

PLATFORM TONE: ${tone}
TOPIC: ${topic}
${question ? `THE PERSON'S SPECIFIC QUESTION: ${question}\n` : ''}

Give them concrete, actionable guidance on how to write effectively about this topic on this platform. Real specifics, not "be authentic" type generalities.

Return ONLY a JSON object with this shape (no markdown, no prose around it):
{
  "core_advice": "2-3 sentences of the most important thing to know about writing this topic on this platform.",
  "do_this": ["3-5 specific techniques/moves that work well"],
  "avoid_this": ["3-5 specific traps, clichés, or mistakes to avoid"],
  "example_hook": "One concrete example opening line in this person's voice (treat them as a thoughtful AI/remote-work professional, not a marketer)"
}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const { mode, platform, source, topic, angle, intent, question } = await req.json();

    if (!mode || !platform) {
      return Response.json({ error: 'mode and platform are required' }, { status: 400 });
    }
    if (mode === 'reply' && !source) return Response.json({ error: 'source (the post/comment) is required for reply mode' }, { status: 400 });
    if ((mode === 'outline' || mode === 'advice') && !topic) {
      return Response.json({ error: 'topic is required for outline/advice mode' }, { status: 400 });
    }

    let prompt;
    let schema;
    if (mode === 'reply') {
      prompt = buildReplyPrompt({ platform, source, intent });
      schema = {
        type: 'object',
        properties: {
          replies: {
            type: 'array',
            items: {
              type: 'object',
              properties: { type: { type: 'string' }, text: { type: 'string' } },
            },
          },
        },
      };
    } else if (mode === 'outline') {
      prompt = buildOutlinePrompt({ platform, topic, angle });
      schema = {
        type: 'object',
        properties: {
          hook_options: { type: 'array', items: { type: 'string' } },
          structure: { type: 'string' },
          key_points: { type: 'array', items: { type: 'string' } },
          closing_options: { type: 'array', items: { type: 'string' } },
          tone_notes: { type: 'string' },
          what_to_avoid: { type: 'array', items: { type: 'string' } },
        },
      };
    } else if (mode === 'advice') {
      prompt = buildAdvicePrompt({ platform, topic, question });
      schema = {
        type: 'object',
        properties: {
          core_advice: { type: 'string' },
          do_this: { type: 'array', items: { type: 'string' } },
          avoid_this: { type: 'array', items: { type: 'string' } },
          example_hook: { type: 'string' },
        },
      };
    } else {
      return Response.json({ error: `unknown mode: ${mode}` }, { status: 400 });
    }

    const result = await db.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
    });

    return Response.json({ success: true, mode, platform, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
