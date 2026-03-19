/**
 * Claude API client for SchoolHub.
 *
 * Uses Haiku model for link parsing (fast + cheap).
 * Monthly cap: 1000 calls. Caching: same text → same result.
 * Graceful degradation when API unavailable.
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================
// Types
// ============================================

export interface ParsedMeetingLink {
  url: string | null;
  platform: "zoom" | "teams" | "meet" | "other" | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM
  confidence: number; // 0-1
}

// ============================================
// Cache (in-memory, simple)
// ============================================

const cache = new Map<string, { result: ParsedMeetingLink; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedResult(text: string): ParsedMeetingLink | null {
  const entry = cache.get(text);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(text);
    return null;
  }
  return entry.result;
}

function setCachedResult(text: string, result: ParsedMeetingLink): void {
  cache.set(text, { result, timestamp: Date.now() });
  // Limit cache size
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

// ============================================
// API call tracking (monthly cap)
// ============================================

let monthlyCallCount = 0;
let currentMonth = new Date().getMonth();
const MONTHLY_CAP = 1000;

function checkAndIncrementCallCount(): boolean {
  const now = new Date();
  if (now.getMonth() !== currentMonth) {
    // New month — reset counter
    monthlyCallCount = 0;
    currentMonth = now.getMonth();
  }
  if (monthlyCallCount >= MONTHLY_CAP) {
    return false; // Cap reached
  }
  monthlyCallCount++;
  return true;
}

// ============================================
// Main function
// ============================================

const SYSTEM_PROMPT = `You are a meeting link extractor. Given a Hebrew or English text message (often from WhatsApp), extract:
1. meeting_url: The Zoom, Microsoft Teams, or Google Meet URL (full URL)
2. platform: "zoom", "teams", "meet", or "other"
3. date: The date of the meeting in YYYY-MM-DD format (if mentioned)
4. time: The time in HH:MM format (if mentioned)
5. confidence: How confident you are (0.0 to 1.0)

Respond ONLY with valid JSON. No explanation. Example:
{"url":"https://zoom.us/j/123456","platform":"zoom","date":"2026-03-20","time":"08:00","confidence":0.95}

If no meeting link found, respond: {"url":null,"platform":null,"date":null,"time":null,"confidence":0}`;

/**
 * Parse free text for meeting link info using Claude Haiku.
 *
 * @param text Free text (up to 2000 chars, Hebrew/English)
 * @returns Parsed meeting info or null on failure
 */
export async function parseTextForMeetingLink(
  text: string
): Promise<ParsedMeetingLink | null> {
  // Input validation
  if (!text || text.trim().length === 0) return null;
  if (text.length > 2000) text = text.slice(0, 2000);

  // Check cache
  const cached = getCachedResult(text.trim());
  if (cached) return cached;

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[Claude] ANTHROPIC_API_KEY not set");
    return null;
  }

  // Check monthly cap
  if (!checkAndIncrementCallCount()) {
    console.warn("[Claude] Monthly API call cap reached");
    return null;
  }

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-3-5-haiku-latest",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text.trim() }],
    });

    // Extract text from response
    const content = response.content[0];
    if (content.type !== "text") return null;

    // Parse JSON response
    const parsed: ParsedMeetingLink = JSON.parse(content.text);

    // Validate
    if (parsed.url && !parsed.url.startsWith("http")) {
      parsed.url = null;
      parsed.confidence = 0;
    }

    // Cache result
    setCachedResult(text.trim(), parsed);

    return parsed;
  } catch (error) {
    console.error("[Claude] API error:", error);
    return null; // Graceful degradation
  }
}

/**
 * Reset cache and counters. For testing.
 */
export function resetClaudeState(): void {
  cache.clear();
  monthlyCallCount = 0;
}

export { MONTHLY_CAP };
