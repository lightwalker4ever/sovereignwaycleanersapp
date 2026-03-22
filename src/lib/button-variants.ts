import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)]",
        outline:
          "border border-current bg-transparent hover:bg-white/10",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 py-3",
        sm: "h-8 px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export type ButtonVariantsProps = VariantProps<typeof buttonVariants>;
