import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const DialogContext = createContext({
  open: false,
  onOpenChange: () => {},
});

function Dialog({ open, onOpenChange, children }) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0">
          {children}
        </div>
      )}
    </DialogContext.Provider>
  );
}

function DialogContent({ className, children, ...props }) {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <div
      className={cn(
        "relative w-full max-w-lg rounded-3xl bg-background p-6 shadow-2xl border border-border animate-in zoom-in-95 max-h-[90vh] overflow-y-auto",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <button
        onClick={() => onOpenChange(false)}
        className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1.5 text-left mb-5", className)} {...props} />;
}

function DialogTitle({ className, ...props }) {
  return (
    <h2
      className={cn("text-3xl font-normal leading-none tracking-tight", className)}
      style={{ fontFamily: "'Instrument Serif', serif" }}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }) {
  return (
    <p
      className={cn("text-sm text-muted-foreground mt-2", className)}
      style={{ fontFamily: "Inter, sans-serif" }}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 mt-6", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
