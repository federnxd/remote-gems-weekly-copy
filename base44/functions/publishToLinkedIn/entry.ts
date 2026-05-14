import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postContent, postId, fileUrl, fileName, fileType } = await req.json();
    if (!postContent) {
      return Response.json({ error: 'postContent is required' }, { status: 400 });
    }

    // Get LinkedIn access token from the shared connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('linkedin');

    // Get the LinkedIn member profile (sub = member URN)
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
        // Step 1: Register the asset upload with LinkedIn
        const registerBody = {
          registerUploadRequest: {
            recipes: [isImage ? 'urn:li:digitalmediaRecipe:feedshare-image' : 'urn:li:digitalmediaRecipe:feedshare-document'],
            owner: authorUrn,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            }],
          },
        };

        const registerRes = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(registerBody),
        });

        if (!registerRes.ok) {
          const err = await registerRes.text();
          return Response.json({ error: `LinkedIn asset register error: ${err}` }, { status: 500 });
        }

        const registerData = await registerRes.json();
        const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const assetUrn = registerData.value.asset;

        // Step 2: Download the file from the provided URL
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) {
          return Response.json({ error: 'Failed to fetch the uploaded file' }, { status: 500 });
        }
        const fileBuffer = await fileRes.arrayBuffer();

        // Step 3: Upload the binary to LinkedIn
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': fileType,
          },
          body: fileBuffer,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.text();
          return Response.json({ error: `LinkedIn asset upload error: ${err}` }, { status: 500 });
        }

        shareMediaCategory = isImage ? 'IMAGE' : 'DOCUMENT';
        media = [{
          status: 'READY',
          description: { text: fileName || 'Attachment' },
          media: assetUrn,
          title: { text: fileName || 'Attachment' },
        }];
      }
    }

    // Step 4: Publish the post via LinkedIn UGC Posts API
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
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const publishRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!publishRes.ok) {
      const err = await publishRes.text();
      return Response.json({ error: `LinkedIn API error: ${err}` }, { status: 500 });
    }

    const result = await publishRes.json();
    const linkedInPostId = result.id;

    // Update the post status to published in our DB
    if (postId) {
      await base44.asServiceRole.entities.GeneratedPost.update(postId, {
        status: 'published',
        linkedin_post_id: linkedInPostId,
      });
    }

    return Response.json({ success: true, linkedInPostId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});