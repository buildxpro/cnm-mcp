#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = "https://www.contractorsnearme.ai/api/v2";
const PROXY_URL = "https://lab.buildx.pro/webhook/cnm-api-proxy";
const API_KEY = process.env.CNM_API_KEY;
const USE_PROXY = process.env.CNM_USE_PROXY === "true";

if (!API_KEY && !USE_PROXY) {
  console.error("ERROR: CNM_API_KEY environment variable is required (or set CNM_USE_PROXY=true)");
  process.exit(1);
}

async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  data?: Record<string, string | number | boolean | undefined>
): Promise<unknown> {
  // Use proxy mode if enabled (bypasses Cloudflare blocking)
  if (USE_PROXY) {
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, endpoint, data: data || {} }),
    });
    const json = await response.json();
    if (json.status === "error") {
      throw new Error(json.message || "API request failed");
    }
    return json;
  }

  // Direct mode (requires whitelisted IP)
  const url = `${API_BASE}${endpoint}`;
  const headers: Record<string, string> = {
    "X-Api-Key": API_KEY!,
  };

  let body: string | undefined;

  if (data && method !== "GET") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    }
    body = params.toString();
  }

  const response = await fetch(url, { method, headers, body });
  const json = await response.json();

  if (json.status === "error") {
    throw new Error(json.message || "API request failed");
  }

  return json;
}

const server = new McpServer({
  name: "cnm-mcp",
  version: "1.0.0",
});

server.tool(
  "get_user",
  "Get a contractor/user profile by ID. Returns all profile fields including company, location, services, etc.",
  {
    user_id: z.number().describe("The user ID to fetch"),
  },
  async ({ user_id }) => {
    const result = await apiRequest("GET", `/user/get/${user_id}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "update_user",
  "Update a contractor/user profile. Use active=2 to make listing public. Common fields: company, phone_number, website, year_founded, license_number, hours_of_operation, verified (0/1), active (2=public).",
  {
    user_id: z.number().describe("The user ID to update (required)"),
    email: z.string().optional().describe("Email address"),
    company: z.string().optional().describe("Company/business name"),
    phone_number: z.string().optional().describe("Phone number"),
    website: z.string().optional().describe("Website URL"),
    address1: z.string().optional().describe("Street address"),
    city: z.string().optional().describe("City"),
    state_code: z.string().optional().describe("State code (e.g., FL)"),
    zip_code: z.string().optional().describe("ZIP/postal code"),
    country_code: z.string().optional().describe("Country code (e.g., US)"),
    year_founded: z.number().optional().describe("Year business was founded"),
    license_number: z.string().optional().describe("License number"),
    hours_of_operation: z.string().optional().describe("Business hours (e.g., Mon-Fri 8:00 AM - 5:00 PM)"),
    quote: z.string().optional().describe("Company tagline/quote"),
    verified: z.number().optional().describe("Verified status (0 or 1)"),
    active: z.number().optional().describe("Active status (2 = public, 1 = hidden)"),
    profession_id: z.number().optional().describe("Primary profession/category ID"),
    lat: z.number().optional().describe("Latitude"),
    lng: z.number().optional().describe("Longitude"),
  },
  async (params) => {
    const result = await apiRequest("PUT", "/user/update", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "search_users",
  "Search for contractors/users by keyword, location, etc. Note: May fail if API key has referer restrictions.",
  {
    q: z.string().optional().describe("Search query (company name, keyword)"),
    address: z.string().optional().describe("Location to search (city, state)"),
    limit: z.number().optional().default(10).describe("Max results to return"),
    page: z.number().optional().default(1).describe("Page number for pagination"),
  },
  async ({ q, address, limit, page }) => {
    const result = await apiRequest("POST", "/user/search", { q, address, limit, page });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "create_user",
  "Create a new contractor/user account. Use subscription_id=8 for 'Claim Listing' (free). Must set active=2 separately to make public.",
  {
    email: z.string().describe("Email address (required)"),
    password: z.string().describe("Password (required)"),
    subscription_id: z.number().default(8).describe("Subscription plan ID (8 = Claim Listing)"),
    company: z.string().optional().describe("Company/business name"),
    first_name: z.string().optional().describe("First name"),
    last_name: z.string().optional().describe("Last name"),
    phone_number: z.string().optional().describe("Phone number"),
    profession_id: z.number().optional().describe("Primary profession/category ID"),
    city: z.string().optional().describe("City"),
    state_code: z.string().optional().describe("State code (e.g., FL)"),
    country_code: z.string().optional().default("US").describe("Country code"),
  },
  async (params) => {
    const result = await apiRequest("POST", "/user/create", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "create_lead",
  "Create a new lead/inquiry. Can be associated with a specific contractor via user_id.",
  {
    lead_name: z.string().describe("Lead's name"),
    lead_email: z.string().describe("Lead's email"),
    lead_phone: z.string().optional().describe("Lead's phone number"),
    lead_message: z.string().optional().describe("Lead's message/inquiry"),
    lead_location: z.string().optional().describe("Lead's location"),
    top_category_name: z.string().optional().describe("Service category name"),
    user_id: z.number().optional().describe("Contractor user_id to send lead to"),
    lat: z.number().optional().describe("Latitude"),
    lng: z.number().optional().describe("Longitude"),
    status: z.number().optional().default(1).describe("Lead status (1 = active)"),
  },
  async (params) => {
    const result = await apiRequest("POST", "/leads/create", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_lead",
  "Get a lead by ID",
  {
    lead_id: z.number().describe("The lead ID to fetch"),
  },
  async ({ lead_id }) => {
    const result = await apiRequest("GET", `/leads/get/${lead_id}`);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "create_album",
  "Create a photo album/portfolio group for a contractor. Returns group_id needed for uploading photos.",
  {
    user_id: z.number().describe("The contractor's user ID"),
    group_name: z.string().describe("Album/group name"),
    group_desc: z.string().optional().describe("Album description"),
    data_id: z.number().default(10).describe("Post type ID (10 = Photo Album)"),
    data_type: z.number().default(4).describe("Data type (4 = portfolio)"),
    post_status: z.number().default(1).describe("Status (1 = active)"),
  },
  async (params) => {
    const result = await apiRequest("POST", "/users_portfolio_groups/create", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_albums",
  "Get portfolio albums for a user.",
  {
    user_id: z.number().describe("The contractor's user ID"),
    limit: z.number().optional().default(20).describe("Max results"),
  },
  async ({ user_id, limit }) => {
    const result = await apiRequest("POST", "/users_portfolio_groups/search", { user_id, limit });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "upload_photo_instructions",
  "Get curl command for uploading a photo to a portfolio album (multipart uploads require shell execution).",
  {
    user_id: z.number().describe("The contractor's user ID"),
    group_id: z.number().describe("The album/group ID (from create_album)"),
    title: z.string().describe("Photo title"),
    image_path: z.string().describe("Local path to the image file"),
  },
  async ({ user_id, group_id, title, image_path }) => {
    const curlCommand = `curl -X POST "${API_BASE}/users_portfolio/create" \\
  -H "X-Api-Key: $CNM_API_KEY" \\
  -F "user_id=${user_id}" \\
  -F "group_id=${group_id}" \\
  -F "data_id=10" \\
  -F "title=${title}" \\
  -F "image=@${image_path}"`;

    return {
      content: [
        {
          type: "text",
          text: `To upload the photo, run this curl command:\n\n${curlCommand}\n\nThe CNM_API_KEY environment variable must be set.`,
        },
      ],
    };
  }
);

server.tool(
  "create_review",
  "Create a review for a contractor",
  {
    user_id: z.number().describe("The contractor's user ID being reviewed"),
    rating: z.number().min(1).max(5).describe("Rating (1-5)"),
    review_text: z.string().describe("Review content"),
    reviewer_name: z.string().optional().describe("Reviewer's name"),
    reviewer_email: z.string().optional().describe("Reviewer's email"),
    send_email: z.number().optional().default(0).describe("Send notification email (0 or 1)"),
  },
  async (params) => {
    const result = await apiRequest("POST", "/users_reviews/create", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_reviews",
  "Get reviews for a contractor",
  {
    user_id: z.number().describe("The contractor's user ID"),
    limit: z.number().optional().default(20).describe("Max results"),
  },
  async ({ user_id, limit }) => {
    const result = await apiRequest("POST", "/users_reviews/search", { user_id, limit });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "create_post",
  "Create a data post (job listing, article, etc.)",
  {
    user_id: z.number().describe("The user ID creating the post"),
    post_title: z.string().describe("Post title"),
    post_content: z.string().describe("Post content (HTML allowed)"),
    post_category: z.string().optional().describe("Category name"),
    post_tags: z.string().optional().describe("Comma-separated tags"),
    post_location: z.string().optional().describe("Location string"),
    post_url: z.string().optional().describe("External URL"),
    data_type: z.number().default(20).describe("Post type ID"),
    data_id: z.number().default(100).describe("Data ID"),
    post_status: z.number().default(1).describe("Status (1 = active)"),
    lat: z.number().optional().describe("Latitude"),
    lon: z.number().optional().describe("Longitude"),
    state_sn: z.string().optional().describe("State short name (e.g., FL)"),
    country_sn: z.string().optional().describe("Country short name (e.g., US)"),
  },
  async (params) => {
    const result = await apiRequest("POST", "/data_posts/create", params as Record<string, string | number>);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "verify_api_key",
  "Verify the API key is valid and working",
  {},
  async () => {
    // Use a simple user search as health check since /token/verify doesn't exist in BD API
    const result = await apiRequest("POST", "/user/search", { limit: 1 });
    const response = result as { status?: string; total?: string };
    if (response.status === "success") {
      return {
        content: [{ type: "text", text: JSON.stringify({ status: "success", message: "API key is valid", total_users: response.total }, null, 2) }],
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_profile_url",
  "Get the public profile URL for a user by fetching their filename field.",
  {
    user_id: z.number().describe("The user ID"),
  },
  async ({ user_id }) => {
    const result = (await apiRequest("GET", `/user/get/${user_id}`)) as {
      message?: { filename?: string };
    };
    const filename = result?.message?.filename;
    if (filename) {
      return {
        content: [
          {
            type: "text",
            text: `Profile URL: https://www.contractorsnearme.ai/${filename}\nFilename: ${filename}`,
          },
        ],
      };
    }
    return {
      content: [{ type: "text", text: "Could not determine profile URL. Full response:\n" + JSON.stringify(result, null, 2) }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CNM MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
