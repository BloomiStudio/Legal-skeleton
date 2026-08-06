import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/constants";

// Placeholder mínimo: prueba que auth + RLS + el primer profile funcionan
// de punta a punta. Los módulos reales (expedientes, clientes, documentos,
// etc.) se construyen sobre esta misma base — ver README.md.
export function DashboardPage() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {profile?.full_name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-muted-foreground">Esqueleto base conectado a Supabase — listo para construir los módulos.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu sesión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nombre:</span> {profile?.full_name}
          </p>
          <p>
            <span className="text-muted-foreground">Rol:</span> {profile ? ROLE_LABELS[profile.role] : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
