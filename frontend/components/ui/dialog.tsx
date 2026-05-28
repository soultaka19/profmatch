"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Affiche un bouton pour élargir la fenêtre (défaut : false). */
  expandable?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, expandable = false, ...props }, ref) => {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[520px] translate-x-[-50%] translate-y-[-50%] gap-5 border border-border bg-canvas-pure p-7 shadow-lift rounded-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          expandable && (expanded ? "max-w-[min(1100px,92vw)]" : "max-w-3xl"),
          className
        )}
        {...props}
      >
        {children}
        {expandable && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-label={expanded ? "Réduire la fenêtre" : "Agrandir la fenêtre"}
            aria-pressed={expanded}
            className="absolute right-12 top-4 rounded-sm opacity-60 ring-offset-canvas-pure transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-ring"
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4 text-fg-muted" />
            ) : (
              <Maximize2 className="h-4 w-4 text-fg-muted" />
            )}
          </button>
        )}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-60 ring-offset-canvas-pure transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary-ring disabled:pointer-events-none">
          <X className="h-4 w-4 text-fg-muted" />
          <span className="sr-only">Fermer</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-title font-semibold text-fg",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-fg-muted", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
