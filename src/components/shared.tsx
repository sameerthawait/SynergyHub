import { Link } from "@tanstack/react-router";
import { members, type Member } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function Avatar({ m, size = 28 }: { m: Member; size?: number }) {
  return (
    <div
      title={m.name}
      className="relative inline-flex items-center justify-center rounded-full bg-gradient-primary text-primary-foreground font-semibold ring-2 ring-background"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {m.avatar}
      {m.status && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background",
            m.status === "online" && "bg-[color:var(--neon)] neon-pulse-dot",
            m.status === "idle" && "bg-yellow-400",
            m.status === "offline" && "bg-muted-foreground",
          )}
        />
      )}
    </div>
  );
}

export function AvatarStack({ ids, size = 28 }: { ids: string[]; size?: number }) {
  const list = ids.map((id) => members.find((m) => m.id === id)!).filter(Boolean);
  return (
    <div className="flex -space-x-2">
      {list.map((m) => (
        <Avatar key={m.id} m={m} size={size} />
      ))}
    </div>
  );
}

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-2 font-display font-bold text-lg", className)}
    >
      <div className="relative h-8 w-8 rounded-xl bg-gradient-primary shadow-glow">
        <div className="absolute inset-1 rounded-lg bg-background/40 backdrop-blur grid place-items-center">
          <div className="h-2 w-2 rounded-full bg-[color:var(--neon)]" />
        </div>
      </div>
      <span>
        Synergy<span className="text-gradient">Hub</span>
      </span>
    </Link>
  );
}

export { Avatar };
