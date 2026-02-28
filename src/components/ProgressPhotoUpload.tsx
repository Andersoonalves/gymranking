import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
    userId: string;
    onUploaded: (url: string) => void;
    onClear: () => void;
    uploadedUrl: string | null;
};

export function ProgressPhotoUpload({ userId, onUploaded, onClear, uploadedUrl }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(uploadedUrl ?? null);

    const handleFile = async (file: File) => {
        if (!file) return;
        setUploading(true);
        const ext = file.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage
            .from("progress-photos")
            .upload(filePath, file, { upsert: true });
        if (error) {
            console.error("Upload error:", error);
            setUploading(false);
            return;
        }
        const { data } = supabase.storage.from("progress-photos").getPublicUrl(filePath);
        const url = data.publicUrl;
        setPreview(url);
        onUploaded(url);
        setUploading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleClear = () => {
        setPreview(null);
        onClear();
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <div className="space-y-2">
            {preview ? (
                <div className="relative inline-block">
                    <img
                        src={preview}
                        alt="Preview do progresso"
                        className="h-40 w-40 rounded-xl object-cover border border-border shadow"
                    />
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                        "flex h-40 w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 transition-colors hover:bg-muted/70",
                        uploading && "pointer-events-none opacity-60"
                    )}
                >
                    {uploading ? (
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                        <>
                            <Camera className="h-8 w-8 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground text-center px-2">
                                Câmera ou galeria
                            </span>
                        </>
                    )}
                </div>
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleChange}
            />
            {!preview && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando…" : "Selecionar foto"}
                </Button>
            )}
        </div>
    );
}
