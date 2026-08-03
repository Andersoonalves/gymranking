import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/ImageCropDialog";

type Props = {
    userId: string;
    onUploaded: (path: string) => void; // returns storage path, not public URL
    onClear: () => void;
    uploadedPath: string | null;
};

export function ProgressPhotoUpload({ userId, onUploaded, onClear, uploadedPath }: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cropFile, setCropFile] = useState<File | null>(null);

    // O pai zera uploadedPath depois de salvar; sem isso o preview da foto anterior fica preso.
    useEffect(() => {
        if (!uploadedPath) {
            setPreviewUrl(null);
            if (fileRef.current) fileRef.current.value = "";
        }
    }, [uploadedPath]);

    const handleFile = async (file: File) => {
        setCropFile(null);
        setUploading(true);

        // Show local blob preview immediately while uploading
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        const ext = file.name.split(".").pop();
        const filePath = `${userId}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from("progress-photos")
            .upload(filePath, file, { upsert: true });

        if (error) {
            console.error("Upload error:", error);
            setPreviewUrl(null);
            setUploading(false);
            return;
        }

        // Generate a signed URL for preview (1 hour)
        const { data: signed } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(filePath, 3600);

        if (signed?.signedUrl) setPreviewUrl(signed.signedUrl);
        onUploaded(filePath); // store only the path in the DB
        setUploading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
        e.target.value = "";
    };

    const handleClear = () => {
        setPreviewUrl(null);
        onClear();
        if (fileRef.current) fileRef.current.value = "";
    };

    const hasPhoto = !!uploadedPath || !!previewUrl;

    return (
        <div className="space-y-2">
            {hasPhoto ? (
                <div className="relative inline-block">
                    <img
                        src={previewUrl ?? ""}
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
            {!hasPhoto && (
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
            <ImageCropDialog
                file={cropFile}
                onCancel={() => setCropFile(null)}
                onConfirm={handleFile}
            />
        </div>
    );
}
