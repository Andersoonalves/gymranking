import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[14px] group-[.toaster]:bg-card group-[.toaster]:font-sans group-[.toaster]:font-bold group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:font-medium",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-mono group-[.toast]:font-bold",
          cancelButton: "group-[.toast]:bg-secondary group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:[&_svg]:text-primary",
          error: "group-[.toaster]:[&_svg]:text-destructive",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
