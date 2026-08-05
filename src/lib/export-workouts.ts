import { format } from "date-fns";
import type { Workout } from "@/hooks/useWorkouts";

/** CSV do histórico de peso: data, kg e nota (separador ; para o Excel pt-BR). */
export function bodyProgressToCSV(entries: { recorded_at: string; weight_kg: number; notes: string | null }[]): string {
  const header = "data;peso_kg;nota";
  const rows = entries.map((e) => {
    const nota = (e.notes ?? "").replace(/"/g, '""');
    return `${format(new Date(e.recorded_at), "yyyy-MM-dd")};${String(e.weight_kg).replace(".", ",")};"${nota}"`;
  });
  return [header, ...rows].join("\n");
}

export function downloadTextFile(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportWorkoutsToJSON(workouts: Workout[], userName?: string) {
  const exportData = {
    exported_at: new Date().toISOString(),
    user: userName || "unknown",
    total_workouts: workouts.length,
    workouts: workouts.map((w) => ({
      date: format(new Date(w.workout_date), "yyyy-MM-dd"),
      time: format(new Date(w.workout_date), "HH:mm"),
      workout_type: w.workout_type,
      notes: w.notes || null,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fitrank-workouts-${format(new Date(), "yyyy-MM-dd")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
