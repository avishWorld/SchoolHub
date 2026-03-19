/**
 * Schedule utilities — instance generation from templates.
 *
 * When a LessonTemplate is created or updated, we auto-generate
 * LessonInstances for the current week + next 2 weeks (3 weeks total).
 *
 * Template changes only propagate to FUTURE instances (not past).
 */

/**
 * Get all dates matching a specific day_of_week for the next N weeks
 * starting from a reference date.
 *
 * @param dayOfWeek 0=Sunday, 1=Monday, ..., 6=Saturday
 * @param weeksAhead How many weeks to generate (default 3: current + 2)
 * @param from Reference date (default: today)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDatesForDay(
  dayOfWeek: number,
  weeksAhead = 3,
  from: Date = new Date()
): string[] {
  const dates: string[] = [];
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);

  // Find the start of the current week (Sunday)
  const currentDay = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - currentDay);

  for (let week = 0; week < weeksAhead; week++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + week * 7 + dayOfWeek);

    // Only include today or future dates
    if (date >= today) {
      dates.push(formatDate(date));
    }
  }

  return dates;
}

/**
 * Format a Date object as YYYY-MM-DD.
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Generate instance insert records for a template.
 * Filters out dates that already have instances.
 */
export function buildInstanceInserts(
  templateId: string,
  dayOfWeek: number,
  existingDates: Set<string>,
  weeksAhead = 3,
  from?: Date
): Array<{ template_id: string; date: string }> {
  const dates = getDatesForDay(dayOfWeek, weeksAhead, from);
  return dates
    .filter((d) => !existingDates.has(d))
    .map((date) => ({
      template_id: templateId,
      date,
    }));
}
