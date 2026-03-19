import bcrypt from "bcryptjs";
import { createServerClient } from "@/lib/supabase";
import type { User } from "@/types/database";

const PIN_LENGTH = 6;
const BCRYPT_COST = 12;
const MAX_RETRIES = 20;

/**
 * Generate a unique 6-digit PIN for a school.
 * Checks against existing PINs via bcrypt compare (expensive but correct).
 *
 * Returns { plain, hash } — plain is shown once to admin, hash is stored.
 */
export async function generateUniquePin(
  schoolId: string
): Promise<{ plain: string; hash: string }> {
  const supabase = createServerClient();

  // Fetch existing PINs for this school
  const { data: users } = await supabase
    .from("user")
    .select("pin")
    .eq("school_id", schoolId)
    .eq("is_active", true);

  const existingHashes = (users as Pick<User, "pin">[] || []).map((u) => u.pin);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const plain = generateRandomPin();
    const isUnique = await checkPinUnique(plain, existingHashes);
    if (isUnique) {
      const hash = await bcrypt.hash(plain, BCRYPT_COST);
      return { plain, hash };
    }
  }

  throw new Error("Failed to generate unique PIN after max retries");
}

/**
 * Generate a random 6-digit PIN string.
 */
function generateRandomPin(): string {
  const num = Math.floor(Math.random() * 900000) + 100000; // 100000-999999
  return num.toString();
}

/**
 * Check that a plaintext PIN doesn't match any existing hashes.
 */
async function checkPinUnique(
  plain: string,
  existingHashes: string[]
): Promise<boolean> {
  for (const hash of existingHashes) {
    const matches = await bcrypt.compare(plain, hash);
    if (matches) return false;
  }
  return true;
}

export { PIN_LENGTH, BCRYPT_COST };
