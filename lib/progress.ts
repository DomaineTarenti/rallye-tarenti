import { createServerClient } from "@/lib/supabase";
import { calculateScore, getRank } from "@/lib/scoring";

/**
 * Activate the next locked step for a team, respecting the team's object_order.
 * If the activated step is an epreuve, notifies the assigned guardian.
 * Returns true if a next step was activated, false if quest is complete.
 */
export async function activateNextStep(
  supabase: ReturnType<typeof createServerClient>,
  teamId: string,
): Promise<boolean> {
  // Get team info
  const { data: team } = await supabase
    .from("teams")
    .select("object_order, session_id, name")
    .eq("id", teamId)
    .single();

  const objectOrder: string[] = team?.object_order ?? [];

  // Get all progress for this team
  const { data: allProgress } = await supabase
    .from("team_progress")
    .select("id, step_id, status")
    .eq("team_id", teamId);

  if (!allProgress || allProgress.length === 0) return false;

  // Get all steps to map step_id → object_id + type
  const stepIds = allProgress.map((p) => p.step_id);
  const { data: allSteps } = await supabase
    .from("steps")
    .select("id, object_id, order, type")
    .in("id", stepIds);

  if (!allSteps) return false;

  const stepToObject = new Map(allSteps.map((s) => [s.id, s.object_id]));
  const stepInfo = new Map(allSteps.map((s) => [s.id, s]));

  // Build order index from team's object_order
  const orderIdx = new Map(objectOrder.map((objId, idx) => [objId, idx]));

  // Find locked steps sorted by team's object order
  const lockedProgress = allProgress
    .filter((p) => p.status === "locked")
    .sort((a, b) => {
      const objA = stepToObject.get(a.step_id) ?? "";
      const objB = stepToObject.get(b.step_id) ?? "";
      const idxA = orderIdx.get(objA) ?? 999;
      const idxB = orderIdx.get(objB) ?? 999;
      return idxA - idxB;
    });

  if (lockedProgress.length > 0) {
    const nextProgress = lockedProgress[0];
    await supabase
      .from("team_progress")
      .update({ status: "active" })
      .eq("id", nextProgress.id);

    // If the next step is an epreuve, notify the assigned guardian
    return true;
  }

  // No more locked steps — quest complete, calculate final score
  const { data: fullTeam } = await supabase
    .from("teams")
    .select("started_at, created_at")
    .eq("id", teamId)
    .single();

  const startTime = fullTeam?.started_at
    ? new Date(fullTeam.started_at).getTime()
    : fullTeam?.created_at
    ? new Date(fullTeam.created_at).getTime()
    : Date.now() - 3600000;
  const endTime = Date.now();

  const { data: hintProgress } = await supabase
    .from("team_progress")
    .select("hint_types")
    .eq("team_id", teamId);

  const allHints = (hintProgress ?? [])
    .flatMap((p) => (p.hint_types as string[]) ?? [])
    .map((type) => ({ type }));

  const finalScore = calculateScore(startTime, endTime, allHints);
  const { key: rank, label: rankLabel } = getRank(finalScore);
  const completionTime = Math.floor((endTime - startTime) / 1000);

  await supabase
    .from("teams")
    .update({
      status: "finished",
      locked: true,
      final_score: finalScore,
      rank,
      rank_label: rankLabel,
      completion_time: completionTime,
    })
    .eq("id", teamId);

  console.log(`[PROGRESS] Team ${teamId} finished: score=${finalScore}, rank=${rankLabel}, time=${completionTime}s`);

  return false;
}
