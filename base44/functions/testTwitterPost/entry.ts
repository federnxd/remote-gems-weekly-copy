import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text } = await req.json();
    const apiKey = Deno.env.get('TWITTER_API_KEY');
    const apiSecret = Deno.env.get('TWITTER_API_SECRET');
    const accessToken = Deno.env.get('TWITTER_ACCESS_TOKEN');
    const accessSecret = Deno.env.get('TWITTER_ACCESS_TOKEN_SECRET');

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return Response.json({ error: 'Twitter credentials missing' }, { status: 400 });
    }

    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';

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

    const tweetText = (text || 'Test tweet 🚀').slice(0, 280);

    const res = await fetch(url, {
      method,
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: tweetText }),
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data }, { status: 400 });
    return Response.json({ success: true, tweetId: data.data?.id, text: tweetText });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});