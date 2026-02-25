import { Link, createFileRoute } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";
import { SearchListings } from "@/components/SearchListings";

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
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">Lister</h1>
            <p className="text-gray-400 mt-1">
              Mini-marketplace manga.
            </p>
          </div>
          {session ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors text-sm"
            >
              Mon dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition-colors text-sm"
            >
              Se connecter
            </Link>
          )}
        </div>

        <SearchListings />
      </main>
    </div>
  );
}
