import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── helpers ──────────────────────────────────────────────────────────────────

async function publishLinkedIn(accessToken, tagged, fileUrl, fileName, fileType) {
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await profileRes.json();
  const authorUrn = `urn:li:person:${profile.sub}`;

  let shareMediaCategory = 'NONE';
  let media = [];

  if (fileUrl && fileType) {
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';
    if (isImage || isPdf) {
      const registerBody = {
        registerUploadRequest: {
          recipes: [isImage ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-document'],
          owner: authorUrn,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
        },
      };
      const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(registerBody),
      });
      if (!registerRes.ok) throw new Error(`LinkedIn asset register: ${await registerRes.text()}`);
      const registerData = await registerRes.json();
      const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const assetUrn = registerData.value.asset;
      const fileBuffer = await (await fetch(fileUrl)).arrayBuffer();
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': fileType },
        body: fileBuffer,
      });
      if (!uploadRes.ok) throw new Error(`LinkedIn asset upload: ${await uploadRes.text()}`);
      shareMediaCategory = isImage ? 'IMAGE' : 'DOCUMENT';
      media = [{ status: 'READY', description: { text: fileName || 'Attachment' }, media: assetUrn, title: { text: fileName || 'Attachment' } }];
    }
  }

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: postContent },
        shareMediaCategory,
        ...(media.length > 0 ? { media } : {}),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const publishRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(body),
  });
  if (!publishRes.ok) throw new Error(`LinkedIn API: ${await publishRes.text()}`);
  const result = await publishRes.json();
  return { postId: result.id };
}

async function publishTwitter(text) {
  const apiKey = Deno.env.get('TWITTER_API_KEY');
  const apiSecret = Deno.env.get('TWITTER_API_SECRET');
  const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
  const accessSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('Twitter API credentials not configured. Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET in settings.');
  }

  // Twitter v2 API with OAuth 1.0a
  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';

  // Build OAuth 1.0a signature
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Build signature base string
  const sortedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;

  const keyData = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', keyData, new TextEncoder().encode(baseString));
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  const authHeader = 'OAuth ' + Object.entries({ ...oauthParams, oauth_signature: signature })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ');

  // Trim to 280 chars for Twitter
  const tweetText = text.length > 280 ? text.slice(0, 277) + '...' : text;

  const res = await fetch(url, {
    method,
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: tweetText }),
  });

  if (!res.ok) throw new Error(`Twitter API: ${await res.text()}`);
  const data = await res.json();
  return { postId: data.data?.id };
}

async function publishFacebook(text) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const pageId = Deno.env.get('FACEBOOK_PAGE_ID');

  if (!pageAccessToken || !pageId) {
    throw new Error('Facebook credentials not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in settings.');
  }

  // Small human-like hesitation before posting
  await new Promise(r => setTimeout(r, Math.floor(Math.random() * 4000) + 1000));

  const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text, access_token: pageAccessToken }),
  });

  if (!res.ok) throw new Error(`Facebook API: ${await res.text()}`);
  const data = await res.json();
  return { postId: data.id };
}

async function generateInstagramImage(base44, text) {
  // Build a thematic prompt from the post content
  const keywords = text.slice(0, 200);
  const prompt = `A vibrant, modern, professional social media image for Instagram about remote work and AI jobs. The image should evoke themes of: remote work, technology, global talent, careers, hiring, AI industry. Style: clean, bold, visually striking, no text overlay. Inspired by: "${keywords}". Bright colors, professional aesthetic, suitable for a tech recruitment brand.`;
  const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
  return result.url;
}

async function publishInstagram(text, base44) {
  const pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  const igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');

  if (!pageAccessToken || !igAccountId) {
    throw new Error('Instagram credentials not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID in settings.');
  }

  const imageUrl = await generateInstagramImage(base44, text);
  return publishInstagramWithImage(text, imageUrl, pageAccessToken, igAccountId);
}

async function publishInstagramWithImage(text, imageUrl, pageAccessToken, igAccountId) {
  if (!pageAccessToken) pageAccessToken = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
  if (!igAccountId) igAccountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID');

  if (!pageAccessToken || !igAccountId) {
    throw new Error('Instagram credentials not configured. Please set FACEBOOK_PAGE_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID in settings.');
  }

  // Step 1: Create media container
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: text,
      access_token: pageAccessToken,
    }),
  });
  if (!createRes.ok) throw new Error(`Instagram create container: ${await createRes.text()}`);
  const { id: creationId } = await createRes.json();

  // Step 2: Wait for Instagram to process the media (status API unreliable, fixed wait is more reliable)
  await new Promise(r => setTimeout(r, 60000));

  // Step 3: Publish the container
  const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: pageAccessToken }),
  });
  if (!publishRes.ok) throw new Error(`Instagram publish: ${await publishRes.text()}`);
  const data = await publishRes.json();
  return { postId: data.id };
}

async function publishMastodon(text) {
  const instanceUrl = Deno.env.get('MASTODON_INSTANCE_URL');
  const accessToken = Deno.env.get('MASTODON_ACCESS_TOKEN');

  if (!instanceUrl || !accessToken) {
    throw new Error('Mastodon credentials not configured. Please set MASTODON_INSTANCE_URL and MASTODON_ACCESS_TOKEN.');
  }

  // Mastodon limit is 500 chars
  const postText = text.length > 500 ? text.slice(0, 497) + '...' : text;
  const baseUrl = instanceUrl.replace(/\/+$/, ''); // remove trailing slashes

  const res = await fetch(`${baseUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: postText, visibility: 'public' }),
  });
  if (!res.ok) throw new Error(`Mastodon API: ${await res.text()}`);
  const data = await res.json();
  return { postId: data.id };
}

async function publishBluesky(text) {
  const handle = Deno.env.get('BLUESKY_HANDLE');
  const appPassword = Deno.env.get('BLUESKY_APP_PASSWORD');

  if (!handle || !appPassword) {
    throw new Error('Bluesky credentials not configured. Please set BLUESKY_HANDLE and BLUESKY_APP_PASSWORD.');
  }

  // Step 1: Create session (get access token)
  const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!sessionRes.ok) throw new Error(`Bluesky auth: ${await sessionRes.text()}`);
  const { accessJwt, did } = await sessionRes.json();

  // Step 2: Create post (max 300 chars)
  const postText = text.length > 300 ? text.slice(0, 297) + '...' : text;

  const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessJwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text: postText,
        createdAt: new Date().toISOString(),
      },
    }),
  });
  if (!postRes.ok) throw new Error(`Bluesky post: ${await postRes.text()}`);
  const data = await postRes.json();
  return { postId: data.uri };
}

async function publishThreads(text) {
  const accessToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  const userId = Deno.env.get('THREADS_USER_ID');

  if (!accessToken || !userId) {
    throw new Error('Threads credentials not configured. Please set THREADS_ACCESS_TOKEN and THREADS_USER_ID in settings.');
  }

  await new Promise(r => setTimeout(r, Math.floor(Math.random() * 4000) + 1000));

  // Step 1: Create media container
  const createRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'TEXT',
      text: text.slice(0, 500), // Threads limit
      access_token: accessToken,
    }),
  });
  if (!createRes.ok) throw new Error(`Threads create container: ${await createRes.text()}`);
  const { id: containerId } = await createRes.json();

  // Step 2: Publish the container
  const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  });
  if (!publishRes.ok) throw new Error(`Threads publish: ${await publishRes.text()}`);
  const data = await publishRes.json();
  return { postId: data.id };
}



// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { postContent, postId, platforms, fileUrl, fileName, fileType, igImageUrl } = await req.json();

    if (!postContent) return Response.json({ error: 'postContent is required' }, { status: 400 });
    if (!platforms || platforms.length === 0) return Response.json({ error: 'No platforms selected' }, { status: 400 });

    // Stamp the micro1 referral link with utm_content=p<postId>_<platform> so
    // each publish gets unique attribution. Done at publish time (not generation)
    // so the same post text can fan out to multiple platforms with distinct tags.
    const stampLink = (text, platform) => {
      if (!text || !postId) return text;
      return text.replace(
        /(https:\/\/refer\.micro1\.ai\/referral\/jobs\?[^\s)"']+)/g,
        (url) => {
          // remove any pre-existing utm_content, then append the per-platform tag
          const cleaned = url.replace(/([?&])utm_content=[^&]*/g, '$1').replace(/[?&]$/, '');
          const sep = cleaned.includes('?') ? '&' : '?';
          return `${cleaned}${sep}utm_content=p${postId}_${platform}`;
        }
      );
    };

    const results = {};

    // Stagger platform posts to avoid simultaneous identical API bursts (more human-like)
    const staggerMs = () => Math.floor(Math.random() * 8000) + 2000; // 2-10s between platforms

    const tasks = platforms.map(async (platform) => {
      await new Promise(r => setTimeout(r, staggerMs()));
      const tagged = stampLink(postContent, platform);
      try {
        if (platform === 'linkedin') {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');
          const r = await publishLinkedIn(accessToken, tagged, fileUrl, fileName, fileType);
          results.linkedin = { success: true, postId: r.postId };
          // Update DB record with linkedin post id
          if (postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, {
              status: 'published',
              linkedin_post_id: r.postId,
            });
          }
        } else if (platform === 'twitter') {
          const r = await publishTwitter(tagged);
          results.twitter = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { twitter_post_id: r.postId, status: 'published' });
          }
        } else if (platform === 'facebook') {
          const r = await publishFacebook(tagged);
          results.facebook = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { fb_post_id: r.postId, status: 'published' });
          }
        } else if (platform === 'threads') {
          const r = await publishThreads(tagged);
          results.threads = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { threads_post_id: r.postId, status: 'published' });
          }
        } else if (platform === 'mastodon') {
          const r = await publishMastodon(tagged);
          results.mastodon = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { mastodon_post_id: r.postId, status: 'published' });
          }
        } else if (platform === 'bluesky') {
          const r = await publishBluesky(tagged);
          results.bluesky = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { bsky_post_id: r.postId, status: 'published' });
          }
        } else if (platform === 'instagram') {
          const imageToUse = igImageUrl || fileUrl;
          const r = imageToUse
            ? await publishInstagramWithImage(tagged, imageToUse)
            : await publishInstagram(tagged, base44);
          results.instagram = { success: true, postId: r.postId };
          if (postId && r.postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, { ig_post_id: r.postId, status: 'published' });
          }
        }
      } catch (e) {
        results[platform] = { success: false, error: e.message };
      }
    });

    await Promise.all(tasks);

    // Mark post as published if at least one platform succeeded
    const anySuccess = Object.values(results).some(r => r.success);
    if (anySuccess && postId && !platforms.includes('linkedin')) {
      await base44.asServiceRole.entities.GeneratedPost.update(postId, { status: 'published' });
    }

    return Response.json({ success: anySuccess, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});