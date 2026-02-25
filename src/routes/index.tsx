import { Link, createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getSession();
    return { session };
  },
  component: HomePage,
});

function HomePage() {
  const { session } = Route.useRouteContext();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-black mb-4">Lister</h1>
        <p className="text-gray-400 text-xl mb-10">
          Mini-marketplace manga. Browse en public, vends depuis le dashboard.
        </p>

        {session ? (
          <div className="space-y-4">
            <p className="text-gray-300">
              Connecté en tant que{" "}
              <span className="text-cyan-400 font-medium">
                {session.user.email}
              </span>
            </p>
            <Link
              to="/dashboard"
              className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors"
            >
              Mon dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-500">Tu n'es pas connecté.</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors"
            >
              Se connecter
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
