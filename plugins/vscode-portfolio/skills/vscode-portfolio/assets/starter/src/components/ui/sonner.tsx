"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-ansi-green" />,
        info: <InfoIcon className="size-4 text-link" />,
        warning: <TriangleAlertIcon className="size-4 text-ansi-yellow" />,
        error: <OctagonXIcon className="size-4 text-ansi-red" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--widget)",
          "--normal-text": "var(--side-foreground)",
          "--normal-border": "var(--widget-border)",
          "--border-radius": "6px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast !font-sans !text-[13px] !shadow-[0_0_8px_2px_rgba(0,0,0,0.3)]",
          description: "!text-description",
          actionButton: "!rounded-[2px] !bg-button !text-button-foreground hover:!bg-button-hover",
          closeButton: "!bg-widget !border-widget-border !text-side-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
