import { format } from "date-fns";
import type { Workout } from "@/hooks/useWorkouts";

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
