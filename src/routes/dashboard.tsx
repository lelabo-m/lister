import { signOut } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    return { user: session.user };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black">Dashboard</h1>
            <p className="text-gray-400 mt-1">{user.email}</p>
          </div>
          <button
            onClick={() =>
              signOut({
                fetchOptions: { onSuccess: () => window.location.assign("/") },
              })
            }
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            Déconnexion
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Annonces actives", value: "—" },
            { label: "Vues ce mois", value: "—" },
            { label: "Contacts reçus", value: "—" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700"
            >
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <p className="text-gray-400 mb-4">Aucune annonce pour l'instant.</p>
          <Link
            to="/"
            className="inline-block px-5 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium text-sm transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>
      </main>
    </div>
  );
}
