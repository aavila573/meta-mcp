import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const FB_API_VERSION = "v22.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

async function fbPost(endpoint: string, params: Record<string, unknown>): Promise<unknown> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not set");
  const res = await fetch(`${FB_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, access_token: token }),
  });
  const data = await res.json();
  if ((data as { error?: { message: string } }).error) {
    throw new Error((data as { error: { message: string } }).error.message);
  }
  return data;
}

export function registerFbPublishingTools(server: McpServer): void {
  const pageId = process.env.FACEBOOK_PAGE_ID;

  // ─── fb_publish_post ─────────────────────────────────────────
  server.tool(
    "fb_publish_post",
    "Publish a text post to a Facebook Page.",
    {
      message: z.string().describe("Text content of the post"),
    },
    async ({ message }) => {
      try {
        const data = await fbPost(`/${pageId}/feed`, { message });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `fb_publish_post failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_publish_photo ─────────────────────────────────────────
  server.tool(
    "fb_publish_photo",
    "Publish a photo with caption to a Facebook Page. Requires a public HTTPS image URL.",
    {
      image_url: z.string().url().describe("Public HTTPS URL of the image"),
      caption: z.string().optional().describe("Caption for the photo"),
    },
    async ({ image_url, caption }) => {
      try {
        const params: Record<string, unknown> = { url: image_url };
        if (caption) params.message = caption;
        const data = await fbPost(`/${pageId}/photos`, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `fb_publish_photo failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
