import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { ImageCropDialog } from "@/components/ImageCropDialog";

const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

interface AvatarUploadProps {
  userId: string;
  currentUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ userId, currentUrl, displayName, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo inválido", { description: "Selecione uma imagem." });
      return;
    }

    setCropFile(file);
    e.target.value = "";
  };

  const handleFile = async (file: File) => {
    setCropFile(null);

    if (file.size > MAX_SIZE) {
      toast.error("Imagem muito grande", { description: "O tamanho máximo é 1 MB." });
      return;
    }

    setUploading(true);

    // Upload vai para o R2 via Worker (`/api/avatar`); ele valida o token e
    // devolve a URL pública já com ?v=<timestamp> para furar o cache do CDN.
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/avatar", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${session?.access_token ?? ""}`,
        "content-type": file.type,
      },
      body: file,
    });

    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({ error: null }))) as { error: string | null };
      toast.error("Erro no upload", { description: error ?? "Tente de novo." });
      setUploading(false);
      return;
    }

    const { url } = (await response.json()) as { url: string };

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("user_id", userId);

    if (updateError) {
      toast.error("Erro ao salvar", { description: updateError.message });
      setUploading(false);
      return;
    }

    setPreview(url);
    onUploaded(url);
    toast.success("Foto atualizada!");
    setUploading(false);
  };

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  // A URL já vem versionada do upload — nada de cache-bust por render, que
  // obrigava o navegador a rebaixar a foto toda vez.
  const src = preview || currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          {src && <AvatarImage src={src} alt="Avatar" />}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          {currentUrl ? "Trocar foto" : "Adicionar foto"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máx 1 MB.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
      />
      <ImageCropDialog
        file={cropFile}
        maxSize={512}
        onCancel={() => setCropFile(null)}
        onConfirm={handleFile}
      />
    </div>
  );
}
