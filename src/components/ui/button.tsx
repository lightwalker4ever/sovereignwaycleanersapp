"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]":
              variant === "default",
            "border border-current bg-transparent hover:bg-gray-100":
              variant === "outline",
            "bg-transparent hover:bg-gray-100": variant === "ghost",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-12 px-6 py-3": size === "lg",
            "h-8 px-3 py-1 text-sm": size === "sm",
            "h-9 w-9": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
