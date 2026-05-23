export function DatabaseSetupRequired({ message }: { message: string }) {
  return (
    <div className="h-full grid place-items-center p-8">
      <div className="max-w-md rounded-xl border border-destructive/30 bg-card p-5">
        <h2 className="font-semibold text-destructive">Database setup required</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <p className="mt-3 text-xs text-muted-foreground">
          Apply the SQL migrations in the Supabase project, then refresh this page.
        </p>
      </div>
    </div>
  );
}
