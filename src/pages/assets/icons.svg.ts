import type { APIRoute } from "astro";
import { sprite } from "../../lib/icons";

export const GET: APIRoute = () =>
  new Response(sprite(), { headers: { "Content-Type": "image/svg+xml" } });
