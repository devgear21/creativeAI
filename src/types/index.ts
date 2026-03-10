export interface ClientAssets {
  logos: string[];
  creatives_reference: string[];
  landing_pages_reference: string[];
}

export type ClientType = "product" | "service";

export type CreativeStyle = "with_text" | "visuals_only";

export type TextPosition = "top" | "middle" | "bottom" | "left" | "right" | "default";

export interface Client {
  id: string;
  name: string;
  client_type: ClientType;
  industry: string | null;
  brand_colors: string | null;
  font_style: string | null;
  tone_of_voice: string | null;
  logo_url: string | null;
  brand_book_url: string | null;
  assets_data: ClientAssets | null;
  created_at: string;
  // Brand document fields
  brand_description: string | null;
  target_audience: string | null;
  visual_vibe: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  other_colors: string | null;
  gradient_variations: string | null;
  heading_font: string | null;
  body_font: string | null;
  style_font: string | null;
  imagery_style: string | null;
  what_to_avoid: string | null;
  dos_and_donts: string | null;
}

export interface Campaign {
  id: string;
  client_id: string;
  headline: string | null;
  ad_copy: string | null;
  platform: Platform;
  aspect_ratio: string;
  scheduled_date: string | null;
  created_at: string;
}

export interface Creative {
  id: string;
  campaign_id: string | null;
  client_id: string;
  image_url: string | null;
  prompt_used: string;
  status: "generating" | "completed" | "failed";
  task_id: string | null;
  parent_creative_id: string | null;
  aspect_ratio: string | null;
  created_at: string;
  client?: Client;
  campaign?: Campaign;
  children?: Creative[];
}

export type Platform = "instagram" | "facebook" | "linkedin" | "twitter";

export type AspectRatio =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "4:5"
  | "5:4"
  | "9:16"
  | "16:9"
  | "21:9";

export interface GenerateRequest {
  client_id: string;
  headline?: string;
  ad_copy?: string;
  platform: Platform;
  aspect_ratio: AspectRatio;
  num_variations: number;
  creative_style: CreativeStyle;
  headline_position?: TextPosition;
  ad_copy_position?: TextPosition;
  logo_urls?: string[];
  creative_ref_urls?: string[];
  lp_ref_urls?: string[];
}

export interface KieCreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface KieTaskStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    model: string;
    state: "waiting" | "queuing" | "generating" | "success" | "fail";
    param: string;
    resultJson: string;
    failCode: string;
    failMsg: string;
    costTime: number;
    completeTime: number;
    createTime: number;
    updateTime: number;
  };
}

export const PLATFORMS: { value: Platform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
];

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: "product", label: "Product Based" },
  { value: "service", label: "Service Based" },
];

export const CREATIVE_STYLES: { value: CreativeStyle; label: string; description: string }[] = [
  { value: "with_text", label: "With Text", description: "Includes headline and ad copy in the creative" },
  { value: "visuals_only", label: "Visuals Only", description: "Pure visual creative with no text elements" },
];

export const TEXT_POSITIONS: { value: TextPosition; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "top", label: "Top" },
  { value: "middle", label: "Middle" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left Side" },
  { value: "right", label: "Right Side" },
];

export const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:5", label: "4:5 (Portrait)" },
  { value: "9:16", label: "9:16 (Story/Reel)" },
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "2:3", label: "2:3" },
  { value: "3:2", label: "3:2" },
  { value: "3:4", label: "3:4" },
  { value: "4:3", label: "4:3" },
  { value: "5:4", label: "5:4" },
  { value: "21:9", label: "21:9 (Ultra-wide)" },
];

export const PLATFORM_DEFAULT_RATIOS: Record<Platform, AspectRatio> = {
  instagram: "1:1",
  facebook: "16:9",
  linkedin: "16:9",
  twitter: "16:9",
};
