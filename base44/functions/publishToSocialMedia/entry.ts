import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── helpers ──────────────────────────────────────────────────────────────────

async function publishLinkedIn(accessToken, postContent, fileUrl, fileName, fileType) {
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

async function publishThreads(text) {
  const accessToken = Deno.env.get('THREADS_ACCESS_TOKEN');
  const userId = Deno.env.get('THREADS_USER_ID');

  if (!accessToken || !userId) {
    throw new Error('Threads credentials not configured. Please set THREADS_ACCESS_TOKEN and THREADS_USER_ID in settings.');
  }

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

    const { postContent, postId, platforms, fileUrl, fileName, fileType } = await req.json();

    if (!postContent) return Response.json({ error: 'postContent is required' }, { status: 400 });
    if (!platforms || platforms.length === 0) return Response.json({ error: 'No platforms selected' }, { status: 400 });

    const results = {};

    // Run all selected platforms in parallel
    const tasks = platforms.map(async (platform) => {
      try {
        if (platform === 'linkedin') {
          const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');
          const r = await publishLinkedIn(accessToken, postContent, fileUrl, fileName, fileType);
          results.linkedin = { success: true, postId: r.postId };
          // Update DB record with linkedin post id
          if (postId) {
            await base44.asServiceRole.entities.GeneratedPost.update(postId, {
              status: 'published',
              linkedin_post_id: r.postId,
            });
          }
        } else if (platform === 'twitter') {
          const r = await publishTwitter(postContent);
          results.twitter = { success: true, postId: r.postId };
        } else if (platform === 'threads') {
          const r = await publishThreads(postContent);
          results.threads = { success: true, postId: r.postId };
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