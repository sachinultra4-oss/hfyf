import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-xl shadow-lg border border-slate-200 font-sans text-sm",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
