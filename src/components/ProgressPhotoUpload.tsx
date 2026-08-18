import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

    // O pai zera uploadedPath depois de salvar; sem isso o preview da foto
    // anterior fica preso. E se o componente remontar (o sheet fecha e abre)
    // com uma foto já enviada, reassina a URL em vez de mostrar <img src="">.
    useEffect(() => {
        if (!uploadedPath) {
            setPreviewUrl(null);
            return;
        }
        if (previewUrl) return;
        let alive = true;
        supabase.storage
            .from("progress-photos")
            .createSignedUrl(uploadedPath, 3600)
            .then(({ data }) => {
                if (alive && data?.signedUrl) setPreviewUrl(data.signedUrl);
            });
        return () => {
            alive = false;
        };
    }, [uploadedPath, previewUrl]);

    const handleFile = async (file: File) => {
        setCropFile(null);
        setUploading(true);

        // Show local blob preview immediately while uploading
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        const ext = file.name.split(".").pop() || "jpg";
        const filePath = `${userId}/${Date.now()}.${ext}`;

        // O caminho tem timestamp, então o objeto nunca muda: cache de 1 ano.
        const { error } = await supabase.storage
            .from("progress-photos")
            .upload(filePath, file, { upsert: true, cacheControl: "31536000" });

        if (error) {
            // Sem o toast a foto some sozinha e ninguém sabe por quê.
            toast.error("Erro ao enviar foto", { description: error.message });
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

    // O reset do input vem antes do picker, nunca depois de ler o File: no
    // Android o arquivo da galeria é um content:// que o reset invalida, e o
    // recorte abria com a imagem vazia. Zerar aqui ainda permite reescolher a
    // mesma foto.
    const openPicker = () => {
        if (!fileRef.current) return;
        fileRef.current.value = "";
        fileRef.current.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setCropFile(file);
    };

    const handleClear = () => {
        setPreviewUrl(null);
        onClear();
    };

    const hasPhoto = !!uploadedPath || !!previewUrl;

    return (
        <div className="space-y-2">
            {hasPhoto ? (
                <div className="relative inline-block">
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            alt="Preview do progresso"
                            className="h-40 w-40 rounded-xl object-cover border border-border shadow"
                        />
                    )}
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
                    onClick={openPicker}
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
                className="hidden"
                onChange={handleChange}
            />
            {!hasPhoto && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={openPicker}
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
