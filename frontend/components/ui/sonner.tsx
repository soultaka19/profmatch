"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      closeButton
      duration={4500}
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-canvas-pure group-[.toaster]:text-fg group-[.toaster]:border-border group-[.toaster]:shadow-card",
          // Toasts de confirmation (succès) : même traitement que l'item actif
          // de la sidebar — fond `primary-soft` + texte/icône `primary`.
          // `!` pour battre le fond neutre de base quel que soit l'ordre CSS.
          success:
            "!bg-primary-soft !text-primary !border-primary/30",
          description:
            "group-[.toast]:text-fg-muted group-[[data-type=success]]:!text-primary/80",
          icon: "group-[[data-type=success]]:text-primary",
          closeButton:
            "group-[[data-type=success]]:!bg-primary-soft group-[[data-type=success]]:!text-primary group-[[data-type=success]]:!border-primary/30",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-surface group-[.toast]:text-fg-muted",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
