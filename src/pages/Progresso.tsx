import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBodyProgress, useAddBodyProgress, useDeleteBodyProgress } from "@/hooks/useBodyProgress";
import { ProgressPhotoUpload } from "@/components/ProgressPhotoUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { TrendingUp, Trash2, Scale, ImageOff } from "lucide-react";
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

export default function Progresso() {
    const { user } = useAuth();
    const { toast } = useToast();
    const userId = user?.id;

    const { data: entries = [], isLoading } = useBodyProgress(userId);
    const addEntry = useAddBodyProgress(userId);
    const deleteEntry = useDeleteBodyProgress(userId);

    const [weightInput, setWeightInput] = useState("");
    const [dateInput, setDateInput] = useState(format(new Date(), "yyyy-MM-dd"));
    const [notes, setNotes] = useState("");
    const [photoPath, setPhotoPath] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Map of entry.id -> signed URL for photos
    const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

    // Generate signed URLs for all entries that have a photo path
    useEffect(() => {
        const entriesWithPhoto = entries.filter((e) => e.photo_url);
        if (entriesWithPhoto.length === 0) return;

        (async () => {
            const results: Record<string, string> = {};
            await Promise.all(
                entriesWithPhoto.map(async (e) => {
                    const { data } = await supabase.storage
                        .from("progress-photos")
                        .createSignedUrl(e.photo_url!, 3600);
                    if (data?.signedUrl) results[e.id] = data.signedUrl;
                })
            );
            setSignedUrls((prev) => ({ ...prev, ...results }));
        })();
    }, [entries]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const weight = parseFloat(weightInput);
        if (!weight || weight <= 0) {
            toast({ title: "Informe um peso válido", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            await addEntry.mutateAsync({
                weight_kg: weight,
                recorded_at: new Date(dateInput + "T12:00:00").toISOString(),
                notes: notes.trim() || null,
                photo_url: photoPath, // store the storage path, not a public URL
            });
            toast({ title: "Registro salvo! 💪" });
            setWeightInput("");
            setNotes("");
            setPhotoPath(null);
            setDateInput(format(new Date(), "yyyy-MM-dd"));
        } catch {
            toast({ title: "Erro ao salvar", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteEntry.mutateAsync(deleteId);
            toast({ title: "Registro removido" });
            setDeleteId(null);
        } catch {
            toast({ title: "Erro ao remover", variant: "destructive" });
        }
    };

    // Chart data: sorted ascending (already from hook)
    const chartData = entries.map((e) => ({
        date: format(parseISO(e.recorded_at), "dd/MM", { locale: ptBR }),
        peso: e.weight_kg,
    }));

    const minWeight = entries.length ? Math.min(...entries.map((e) => e.weight_kg)) - 2 : 0;
    const maxWeight = entries.length ? Math.max(...entries.map((e) => e.weight_kg)) + 2 : 100;

    return (
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
                <p className="text-sm text-muted-foreground">Acompanhe sua evolução de peso e fotos</p>
            </div>

            {/* Weight Chart */}
            {entries.length >= 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Evolução do Peso
                        </CardTitle>
                        <CardDescription>Variação de peso ao longo do tempo</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis
                                    domain={[minWeight, maxWeight]}
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(v) => `${v}kg`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--background))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                        fontSize: "13px",
                                    }}
                                    formatter={(value: number) => [`${value} kg`, "Peso"]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="peso"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#weightGrad)"
                                    dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                    activeDot={{ r: 6 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {entries.length === 1 && (
                <Card className="border-dashed">
                    <CardContent className="flex items-center gap-3 pt-5">
                        <TrendingUp className="h-5 w-5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground">
                            Adicione pelo menos mais um registro para ver o gráfico de evolução.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Registration Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Scale className="h-5 w-5" />
                        Novo Registro
                    </CardTitle>
                    <CardDescription>Registre seu peso e uma foto de progresso</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="weight">Peso (kg)</Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    step="0.1"
                                    min="20"
                                    max="300"
                                    placeholder="Ex: 82.5"
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">Data</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={dateInput}
                                    onChange={(e) => setDateInput(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Observações (opcional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Como foi o treino? Como você está se sentindo?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Foto de progresso (opcional)</Label>
                            {userId && (
                                <ProgressPhotoUpload
                                    userId={userId}
                                    uploadedPath={photoPath}
                                    onUploaded={(path) => setPhotoPath(path)}
                                    onClear={() => setPhotoPath(null)}
                                />
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? "Salvando…" : "Salvar registro"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* History */}
            {entries.length > 0 && (
                <div className="space-y-3">
                    <h2 className="font-semibold text-lg">Histórico</h2>
                    {[...entries].reverse().map((entry) => {
                        const photoUrl = signedUrls[entry.id];
                        return (
                            <Card key={entry.id} className="overflow-hidden">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Photo */}
                                        <div className="shrink-0">
                                            {entry.photo_url ? (
                                                photoUrl ? (
                                                    <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                                                        <img
                                                            src={photoUrl}
                                                            alt="Foto de progresso"
                                                            className="h-20 w-20 rounded-lg object-cover border border-border shadow-sm"
                                                        />
                                                    </a>
                                                ) : (
                                                    // Loading spinner while signed URL is being generated
                                                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted/40">
                                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
                                                    <ImageOff className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xl font-bold">{entry.weight_kg} kg</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(parseISO(entry.recorded_at), "dd 'de' MMMM 'de' yyyy", {
                                                            locale: ptBR,
                                                        })}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteId(entry.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {entry.notes && (
                                                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {!isLoading && entries.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <Scale className="h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhum registro ainda.</p>
                    <p className="text-sm text-muted-foreground">
                        Adicione seu primeiro peso acima para começar!
                    </p>
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Este registro de peso e foto será excluído permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
