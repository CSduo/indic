import { cn } from "@/lib/utils";

type ParchmentCardProps = React.HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  corners?: boolean;
};

export function ParchmentCard({ hover = true, corners = true, className, children, ...props }: ParchmentCardProps) {
  return (
    <div
      className={cn("card-parchment", hover && "hoverable", corners && "card-corners", className)}
      {...props}
    >
      {children}
    </div>
  );
}
