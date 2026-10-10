import { cn } from "@/lib/utils/cn";

type GlassCardProps = React.ComponentProps<"div"> & {
  interactive?: boolean;
};

export function GlassCard({
  interactive = false,
  className,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass rounded-xl p-5",
        interactive &&
          "glass-sheen transition-transform duration-200 ease-out hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  );
}