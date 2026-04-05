import { createServerClient } from "@/lib/supabase";

/**
 * Active la prochaine étape verrouillée pour une équipe (ordre fixe).
 * Si toutes les étapes sont complétées, marque l'équipe comme "finished".
 * Retourne true si une prochaine étape a été activée, false si le rallye est terminé.
 */
export async function activateNextStep(
  supabase: ReturnType<typeof createServerClient>,
  teamId: string,
): Promise<boolean> {
  // Récupérer toutes les progressions de l'équipe
  const { data: allProgress } = await supabase
    .from("team_progress")
    .select("id, step_id, status")
    .eq("team_id", teamId);

  if (!allProgress || allProgress.length === 0) return false;

  // Récupérer les steps pour avoir leur ordre (via objet)
  const stepIds = allProgress.map((p) => p.step_id);
  const { data: allSteps } = await supabase
    .from("steps")
    .select("id, object_id, order")
    .in("id", stepIds);

  if (!allSteps) return false;

  // Récupérer l'ordre des objets
  const objectIds = Array.from(new Set(allSteps.map((s) => s.object_id)));
  const { data: allObjects } = await supabase
    .from("objects")
    .select("id, order")
    .in("id", objectIds);

  const objectOrderMap = new Map((allObjects ?? []).map((o) => [o.id, o.order]));

  // Protection race condition : si une étape est déjà active, ne pas en activer une autre
  const alreadyActive = allProgress.find((p) => p.status === "active");
  if (alreadyActive) return true;

  // Trouver les étapes verrouillées, triées par ordre d'objet
  const stepOrderMap = new Map(allSteps.map((s) => [s.id, objectOrderMap.get(s.object_id) ?? 999]));

  const lockedProgress = allProgress
    .filter((p) => p.status === "locked")
    .sort((a, b) => (stepOrderMap.get(a.step_id) ?? 999) - (stepOrderMap.get(b.step_id) ?? 999));

  if (lockedProgress.length > 0) {
    // Protection race condition : mise à jour conditionnelle
    // (n'affecte la ligne que si elle est encore "locked")
    await supabase
      .from("team_progress")
      .update({ status: "active" })
      .eq("id", lockedProgress[0].id)
      .eq("status", "locked");
    return true;
  }

  // Plus d'étapes verrouillées — rallye terminé
  const { data: teamData } = await supabase
    .from("teams")
    .select("started_at, created_at")
    .eq("id", teamId)
    .single();

  const startTime = teamData?.started_at
    ? new Date(teamData.started_at).getTime()
    : teamData?.created_at
    ? new Date(teamData.created_at).getTime()
    : Date.now() - 3600000;

  const completionTime = Math.floor((Date.now() - startTime) / 1000);

  await supabase
    .from("teams")
    .update({
      status: "finished",
      locked: true,
      completion_time: completionTime,
    })
    .eq("id", teamId);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[RALLYE] Équipe ${teamId} a terminé le rallye en ${completionTime}s`);
  }

  return false;
}
