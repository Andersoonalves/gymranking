import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBodyProgress, useAddBodyProgress, useDeleteBodyProgress } from "@/hooks/useBodyProgress";
import { useMyGroups } from "@/hooks/useGroups";
import { useGroupWorkouts } from "@/hooks/useWorkouts";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useExerciseHistory } from "@/hooks/useExerciseHistory";
import { useActiveGroupId } from "@/hooks/useActiveGroup";
import { filterWorkoutsByPeriod, longestStreak } from "@/lib/ranking";
import { bodyProgressToCSV, downloadTextFile } from "@/lib/export-workouts";
import { NEW_WEIGHT_EVENT } from "@/lib/constants";
import { ProgressPhotoUpload } from "@/components/ProgressPhotoUpload";
import { PhotoCompare, type ComparePhoto } from "@/components/PhotoCompare";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { differenceInCalendarWeeks, format, parseISO, startOfDay, startOfWeek, startOfYear, subDays, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Download, GitCompareArrows, ImageOff, Lock, Plus, Scale, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Range = "3m" | "6m" | "all";

function kgLabel(kg: number) {
  return kg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Delta sem julgamento: sempre na cor da marca, nunca verde/vermelho. */
function deltaLabel(from: number, to: number) {
  const d = to - from;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `${sign}${Math.abs(d).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

export default function Progresso() {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: entries = [], isLoading } = useBodyProgress(userId);
  const { data: groups = [] } = useMyGroups(userId);
  const [activeGroupId] = useActiveGroupId();
  const selectedGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const { data: workouts = [] } = useGroupWorkouts(selectedGroup?.id);
  const { data: myProfile } = useMyProfile(userId);
  const { data: exerciseHistory = [] } = useExerciseHistory(userId);
  const myWorkouts = useMemo(() => workouts.filter((w) => w.user_id === userId), [workouts, userId]);
  const weeklyGoal = myProfile?.weekly_goal ?? 4;
  const addEntry = useAddBodyProgress(userId);
  const deleteEntry = useDeleteBodyProgress(userId);

  const [range, setRange] = useState<Range>("6m");
  const [weightInput, setWeightInput] = useState("");
  const [dateInput, setDateInput] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // CTA "Registrar peso" da sidebar desktop abre o formulário daqui
  useEffect(() => {
    const open = () => setFormOpen(true);
    window.addEventListener(NEW_WEIGHT_EVENT, open);
    return () => window.removeEventListener(NEW_WEIGHT_EVENT, open);
  }, []);

  // URLs assinadas para as fotos (bucket privado)
  useEffect(() => {
    const entriesWithPhoto = entries.filter((e) => e.photo_url);
    if (entriesWithPhoto.length === 0) return;
    (async () => {
      const results: Record<string, string> = {};
      await Promise.all(
        entriesWithPhoto.map(async (e) => {
          const { data } = await supabase.storage.from("progress-photos").createSignedUrl(e.photo_url!, 3600);
          if (data?.signedUrl) results[e.id] = data.signedUrl;
        }),
      );
      setSignedUrls((prev) => ({ ...prev, ...results }));
    })();
  }, [entries]);

  const rangedEntries = useMemo(() => {
    if (range === "all") return entries;
    const cutoff = subMonths(new Date(), range === "3m" ? 3 : 6);
    return entries.filter((e) => parseISO(e.recorded_at) >= cutoff);
  }, [entries, range]);

  const chartData = rangedEntries.map((e) => ({
    date: format(parseISO(e.recorded_at), "dd/MM", { locale: ptBR }),
    peso: e.weight_kg,
  }));
  const minWeight = rangedEntries.length ? Math.min(...rangedEntries.map((e) => e.weight_kg)) - 2 : 0;
  const maxWeight = rangedEntries.length ? Math.max(...rangedEntries.map((e) => e.weight_kg)) + 2 : 100;

  const latest = entries[entries.length - 1];
  const rangeFirst = rangedEntries[0];

  // ── Desktop: média 30d, heatmap do ano, semanas na meta e recordes ────────
  const avg30d = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    const recent = entries.filter((e) => parseISO(e.recorded_at) >= cutoff);
    if (recent.length === 0) return null;
    return recent.reduce((acc, e) => acc + e.weight_kg, 0) / recent.length;
  }, [entries]);

  const yearCells = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of myWorkouts) {
      const k = format(new Date(w.workout_date), "yyyy-MM-dd");
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const end = startOfDay(new Date());
    const start = startOfWeek(subDays(end, 364), { weekStartsOn: 1 });
    const cells: { key: string; count: number }[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = format(d, "yyyy-MM-dd");
      cells.push({ key: k, count: counts[k] ?? 0 });
    }
    return cells;
  }, [myWorkouts]);

  const yearCount = useMemo(() => filterWorkoutsByPeriod(myWorkouts, "year").length, [myWorkouts]);
  const maxStreak = useMemo(() => longestStreak(myWorkouts.map((w) => w.workout_date)), [myWorkouts]);
  const weeksOnGoalPct = useMemo(() => {
    const byWeek: Record<string, number> = {};
    for (const w of filterWorkoutsByPeriod(myWorkouts, "year")) {
      const wk = format(startOfWeek(new Date(w.workout_date), { weekStartsOn: 1 }), "yyyy-MM-dd");
      byWeek[wk] = (byWeek[wk] ?? 0) + 1;
    }
    const weeksElapsed = differenceInCalendarWeeks(new Date(), startOfYear(new Date()), { weekStartsOn: 1 }) + 1;
    const ok = Object.values(byWeek).filter((c) => c >= weeklyGoal).length;
    return Math.round((ok / Math.max(1, weeksElapsed)) * 100);
  }, [myWorkouts, weeklyGoal]);

  // Recordes pessoais: maior carga por exercício, top 4
  const personalBests = useMemo(() => {
    const best: Record<string, { load: number; reps: number; date: string }> = {};
    for (const h of exerciseHistory) {
      if (h.load_kg <= 0) continue;
      const cur = best[h.exercise_title];
      if (!cur || h.load_kg > cur.load) best[h.exercise_title] = { load: h.load_kg, reps: h.reps, date: h.recorded_at };
    }
    return Object.entries(best)
      .sort((a, b) => b[1].load - a[1].load)
      .slice(0, 4);
  }, [exerciseHistory]);

  const exportCSV = () => {
    downloadTextFile(bodyProgressToCSV(entries), `fitrank-progresso-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  const photos: ComparePhoto[] = useMemo(
    () =>
      entries
        .filter((e) => e.photo_url)
        .map((e) => ({
          id: e.id,
          url: signedUrls[e.id] ?? null,
          kg: e.weight_kg,
          date: format(parseISO(e.recorded_at), "dd MMM", { locale: ptBR }).toUpperCase(),
        })),
    [entries, signedUrls],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput.replace(",", "."));
    if (!weight || weight <= 0) {
      toast.error("Informe um peso válido");
      return;
    }
    setSaving(true);
    try {
      await addEntry.mutateAsync({
        weight_kg: weight,
        recorded_at: new Date(dateInput + "T12:00:00").toISOString(),
        notes: notes.trim() || null,
        photo_url: photoPath,
      });
      toast.success("Registro salvo!");
      setWeightInput("");
      setNotes("");
      setPhotoPath(null);
      setDateInput(format(new Date(), "yyyy-MM-dd"));
      setFormOpen(false);
    } catch {
      toast.error("Erro ao salvar registro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEntry.mutateAsync(deleteId);
      toast.success("Registro removido");
      setDeleteId(null);
    } catch {
      toast.error("Erro ao remover registro");
    }
  };

  const inputClass =
    "w-full rounded-[11px] border border-border bg-background p-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary";

  return (
    // Desktop: grid de 2 colunas (gráfico + histórico | fotos + ações), mesma
    // técnica do Início — wrappers `contents` no mobile, ordem via `order-*`.
    <div className="mx-auto flex max-w-lg flex-col gap-3.5 px-5 pb-4 pt-4 safe-area-top lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5 lg:px-8 lg:pt-7">
      <div className="flex items-end justify-between gap-3 lg:col-span-2">
        <div className="flex flex-col gap-1">
          <h1 className="display-title text-[28px] text-foreground">Progresso</h1>
          <p className="text-xs text-muted-foreground">Acompanhe sua evolução de peso e fotos. Só você vê.</p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={exportCSV}
            className="hidden h-9 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary lg:flex"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        )}
      </div>

      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3.5">
      {/* Peso atual + gráfico */}
      {entries.length > 0 && (
        <div className="order-1 rounded-[18px] border border-border bg-card p-4 lg:p-5">
          <div className="mb-3.5 flex items-end justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="mono-label">Peso atual</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[34px] font-bold leading-none tabular-nums text-foreground">
                  {latest ? kgLabel(latest.weight_kg) : "—"}
                </span>
                <span className="font-mono text-[13px] font-semibold text-muted-foreground">kg</span>
                {latest && rangeFirst && rangeFirst.id !== latest.id && (
                  <span className="rounded-[7px] bg-primary/15 px-2 py-1 font-mono text-[11px] font-bold text-primary">
                    {deltaLabel(rangeFirst.weight_kg, latest.weight_kg)}
                  </span>
                )}
              </div>
            </div>
            {avg30d !== null && (
              <>
                <div className="hidden w-px self-stretch bg-border lg:block" />
                <div className="hidden flex-col gap-1 lg:flex">
                  <span className="mono-label">Média 30d</span>
                  <span className="font-mono text-[26px] font-bold leading-none tabular-nums text-foreground/80">{kgLabel(avg30d)}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {latest && avg30d > latest.weight_kg
                      ? "tendência de queda"
                      : latest && avg30d < latest.weight_kg
                        ? "tendência de alta"
                        : "estável"}
                  </span>
                </div>
              </>
            )}
            <div className="hidden flex-1 lg:block" />
            <div className="flex gap-0.5 rounded-[9px] border border-border bg-secondary p-[3px]">
              {(
                [
                  ["3m", "3M"],
                  ["6m", "6M"],
                  ["all", "Tudo"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRange(value)}
                  className={cn(
                    "rounded-md px-2.5 py-[5px] text-[10px]",
                    range === value ? "bg-primary font-bold text-primary-foreground" : "font-semibold text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontFamily: "IBM Plex Mono" }}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontFamily: "IBM Plex Mono",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number) => [`${kgLabel(value)} kg`, "Peso"]}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  fill="url(#weightGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(var(--chart-1))", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Mais um registro no período e a linha aparece.
            </p>
          )}
        </div>
      )}

      {/* Um ano de treinos — heatmap (desktop) */}
      <div className="order-2 hidden flex-col gap-3.5 rounded-[18px] border border-border bg-card p-5 lg:flex">
        <div className="flex items-center justify-between">
          <span className="display-title text-sm text-foreground">Um ano de treinos</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase text-muted-foreground/70">menos</span>
            <span className="h-[11px] w-[11px] rounded-[3px] bg-secondary" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-primary/30" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-primary/60" />
            <span className="h-[11px] w-[11px] rounded-[3px] bg-primary" />
            <span className="font-mono text-[10px] uppercase text-muted-foreground/70">mais</span>
          </div>
        </div>
        <div className="grid grid-flow-col grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px]">
          {yearCells.map((c) => (
            <div
              key={c.key}
              title={`${c.key} · ${c.count} ${c.count === 1 ? "treino" : "treinos"}`}
              className={cn(
                "aspect-square w-full rounded-[2.5px]",
                c.count === 0 ? "bg-secondary" : c.count === 1 ? "bg-primary/30" : c.count === 2 ? "bg-primary/60" : "bg-primary",
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-6 pt-1">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">{yearCount}</span>
            <span className="mono-label">treinos no ano</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-foreground">{maxStreak}</span>
            <span className="mono-label">maior streak</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xl font-bold tabular-nums text-primary">{weeksOnGoalPct}%</span>
            <span className="mono-label">semanas na meta</span>
          </div>
        </div>
      </div>

      {/* Histórico */}
      {entries.length > 0 && (
        <div className="order-4 flex flex-col gap-2">
          <span className="mono-label">Histórico</span>

          {/* Tabela desktop: Data · Peso · Δ · Nota · Foto */}
          <div className="hidden overflow-hidden rounded-[18px] border border-border bg-card lg:block">
            <div className="grid grid-cols-[110px_90px_90px_1fr_80px] items-center gap-3.5 border-b border-border bg-secondary/50 px-5 py-3">
              <span className="mono-label">Data</span>
              <span className="mono-label">Peso</span>
              <span className="mono-label">Δ</span>
              <span className="mono-label">Nota</span>
              <span className="mono-label text-right">Foto</span>
            </div>
            {[...entries].reverse().map((entry, i, arr) => {
              const prev = arr[i + 1];
              const photoUrl = signedUrls[entry.id];
              return (
                <div
                  key={entry.id}
                  className="group grid grid-cols-[110px_90px_90px_1fr_80px] items-center gap-3.5 border-b border-border/50 px-5 py-3 last:border-b-0 hover:bg-secondary/40"
                >
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {format(parseISO(entry.recorded_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-foreground">{kgLabel(entry.weight_kg)}</span>
                  <span className="font-mono text-[13px] font-bold tabular-nums text-primary">
                    {prev ? deltaLabel(prev.weight_kg, entry.weight_kg) : "—"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{entry.notes ?? ""}</span>
                  <span className="flex items-center justify-end gap-1">
                    {entry.photo_url && (
                      <button
                        type="button"
                        aria-label="Ampliar foto de progresso"
                        onClick={() => {
                          const idx = photos.findIndex((p) => p.id === entry.id);
                          if (idx >= 0) setLightboxIdx(idx);
                        }}
                        className="h-9 w-7 overflow-hidden rounded-md border border-border bg-secondary"
                      >
                        {photoUrl ? (
                          <img src={photoUrl} alt="Foto de progresso" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <ImageOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                          </span>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remover registro"
                      onClick={() => setDeleteId(entry.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/40 opacity-0 hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 lg:hidden">
          {[...entries].reverse().map((entry, i, arr) => {
            const prev = arr[i + 1];
            const photoUrl = signedUrls[entry.id];
            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card p-3 hover:border-border">
                {entry.photo_url && (
                  <button
                    type="button"
                    aria-label="Ampliar foto de progresso"
                    onClick={() => {
                      const idx = photos.findIndex((p) => p.id === entry.id);
                      if (idx >= 0) setLightboxIdx(idx);
                    }}
                    className="h-[52px] w-[42px] shrink-0 overflow-hidden rounded-[9px] border border-border bg-secondary"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="Foto de progresso" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                      </span>
                    )}
                  </button>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[17px] font-bold text-foreground">{kgLabel(entry.weight_kg)}</span>
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground">kg</span>
                    {prev && (
                      <span className="font-mono text-[11px] font-bold text-primary">{deltaLabel(prev.weight_kg, entry.weight_kg)}</span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                      {format(parseISO(entry.recorded_at), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {entry.notes && <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{entry.notes}</span>}
                </div>
                <button
                  type="button"
                  aria-label="Remover registro"
                  onClick={() => setDeleteId(entry.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive"
                >
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <EmptyState
          icon={Scale}
          title="Nenhum registro ainda"
          description="Dois pesos já viram uma linha. Comece pelo de hoje."
          className="order-4"
        />
      )}
      </div>

      {/* Coluna direita (desktop): fotos, novo registro e privacidade */}
      <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3.5">
      {/* Antes · depois (desktop) */}
      {photos.length >= 2 && (
        <div className="order-2 hidden overflow-hidden rounded-[18px] border border-border bg-card lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <span className="display-title text-sm text-foreground">Antes · depois</span>
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-primary">
              {deltaLabel(photos[0].kg, photos[photos.length - 1].kg).toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border">
            {[photos[0], photos[photos.length - 1]].map((p, i) => (
              <div key={p.id} className="relative flex aspect-[3/4] flex-col justify-end bg-secondary p-2">
                {p.url ? (
                  <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <ImageOff className="h-6 w-6 text-muted-foreground/40" />
                  </span>
                )}
                <span
                  className={cn(
                    "relative self-start rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-bold",
                    i === 1 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {p.date} · {kgLabel(p.kg)}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="flex items-center justify-center gap-1.5 border-t border-border bg-secondary/50 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary hover:bg-secondary"
          >
            <GitCompareArrows className="h-4 w-4" />
            Comparar fotos
          </button>
        </div>
      )}

      {/* Fotos de progresso (mobile) */}
      {photos.length > 0 && (
        <div className="order-2 flex flex-col gap-3 rounded-[18px] border border-border bg-card p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-extrabold text-foreground">Fotos de progresso</span>
            <span className="font-mono text-[11px] text-muted-foreground/70">{photos.length}</span>
          </div>
          <div className={cn("grid gap-1.5", photos.length > 3 ? "grid-cols-[1fr_1fr_1fr_46px]" : "grid-cols-3")}>
            {photos.slice(-3).map((p, i, arr) => {
              const isLast = i === arr.length - 1;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative flex flex-col justify-end overflow-hidden rounded-[11px] border p-1.5",
                    isLast ? "border-primary/40" : "border-border",
                  )}
                >
                  {p.url ? (
                    <img src={p.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                      <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="aspect-[3/4]" />
                  <span
                    className={cn(
                      "relative self-start rounded bg-background/70 px-1 py-0.5 font-mono text-[9px] font-semibold",
                      isLast ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {p.date}
                  </span>
                </div>
              );
            })}
            {photos.length > 3 && (
              <div className="flex items-center justify-center rounded-[11px] border border-border bg-secondary">
                <span className="font-mono text-[13px] font-bold text-muted-foreground">+{photos.length - 3}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-[13px] text-[13px] font-bold text-foreground hover:border-primary hover:text-primary"
          >
            <GitCompareArrows className="h-[18px] w-[18px]" />
            Comparar fotos
          </button>
        </div>
      )}

      {/* Novo registro — abre em bottom sheet */}
      <button
        type="button"
        onClick={() => setFormOpen(true)}
        className="order-3 flex w-full items-center justify-center gap-2 rounded-[14px] bg-primary p-[16px] text-sm font-extrabold text-primary-foreground shadow-hard active-hard"
      >
        <Plus className="h-5 w-5" />
        Novo registro
      </button>

      {/* Recordes pessoais (desktop) */}
      {personalBests.length > 0 && (
        <div className="order-4 hidden flex-col gap-3 rounded-[18px] border border-border bg-card p-4 lg:flex">
          <span className="display-title text-sm text-foreground">Recordes pessoais</span>
          <div className="flex flex-col gap-2">
            {personalBests.map(([title, pr]) => (
              <div key={title} className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[13px] font-bold text-foreground">{title}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {format(parseISO(pr.date), "dd MMM", { locale: ptBR })} · 1×{pr.reps}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold tabular-nums text-primary">{pr.load.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacidade */}
      <div className="order-5 flex items-center gap-2.5 rounded-[14px] border border-border/60 bg-card px-3.5 py-3">
        <Lock className="h-[19px] w-[19px] shrink-0 text-muted-foreground" />
        <span className="flex-1 text-[11px] leading-relaxed text-muted-foreground">
          Seus registros e fotos são privados. Ninguém do grupo vê — nem aparecem no feed.
        </span>
      </div>
      </div>

      {/* Bottom sheet: novo registro */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[26px] border-t border-border bg-card p-0 shadow-[0_-20px_50px_rgba(0,0,0,0.4)] sheet-desktop-modal"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 px-5 pb-6 pt-3 safe-area-bottom">
            <div className="h-1 w-9 self-center rounded-full bg-border" />
            <SheetTitle className="display-title text-[22px] text-foreground">Novo registro</SheetTitle>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="mono-label">Peso (kg)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 82.5"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  required
                  className={cn(inputClass, "font-mono font-semibold")}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="mono-label">Data</span>
                <input
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  required
                  className={cn(inputClass, "font-mono")}
                />
              </label>
            </div>
            <textarea
              placeholder="Como foi o treino? Como você está se sentindo?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={cn(inputClass, "resize-none text-xs leading-relaxed")}
            />
            <div className="flex flex-col gap-1.5">
              <span className="mono-label">Foto de progresso · opcional</span>
              {userId && (
                <ProgressPhotoUpload
                  userId={userId}
                  uploadedPath={photoPath}
                  onUploaded={(path) => setPhotoPath(path)}
                  onClear={() => setPhotoPath(null)}
                />
              )}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-[14px] bg-primary p-[16px] text-sm font-extrabold text-primary-foreground shadow-hard active-hard disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar registro"}
            </button>
          </form>
        </SheetContent>
      </Sheet>

      <PhotoCompare open={compareOpen} onOpenChange={setCompareOpen} photos={photos} />

      {lightboxIdx !== null && (
        <PhotoLightbox
          photos={photos.map((p) => ({ id: p.id, url: p.url, title: kgLabel(p.kg), subtitle: `kg · ${p.date}` }))}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-title">Remover registro?</AlertDialogTitle>
            <AlertDialogDescription>Este registro de peso e foto será excluído permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground shadow-hard-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
