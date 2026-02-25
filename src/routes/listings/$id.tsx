import { Link, createFileRoute } from "@tanstack/react-router";
import { getListingWithUserStats } from "@/domain/listing/functions";

export const Route = createFileRoute("/listings/$id")({
  loader: async ({ params }) => {
    return await getListingWithUserStats({ data: params.id });
  },
  component: ListingPage,
});

const conditionLabel: Record<string, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "État correct",
};

function ListingPage() {
  const { listing, userListings } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/"
          className="text-gray-400 hover:text-white text-sm mb-6 inline-block"
        >
          ← Retour
        </Link>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-black">{listing.title}</h1>
            <span className="text-2xl font-bold text-cyan-400">
              {(listing.price / 100).toFixed(2)} €
            </span>
          </div>
          <div className="flex gap-2 mb-4">
            <span className="px-2 py-1 bg-slate-700 rounded text-xs text-gray-300">
              {conditionLabel[listing.condition] ?? listing.condition}
            </span>
            <span
              className={`px-2 py-1 rounded text-xs ${
                listing.status === "active"
                  ? "bg-green-900/40 text-green-400"
                  : "bg-slate-700 text-gray-400"
              }`}
            >
              {listing.status}
            </span>
          </div>
          <p className="text-gray-300 leading-relaxed">{listing.description}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="font-semibold mb-3 text-gray-300">
            Autres annonces du vendeur ({userListings.length})
          </h2>
          {userListings.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucune autre annonce.</p>
          ) : (
            <div className="space-y-2">
              {userListings
                .filter((l) => l.id !== listing.id)
                .slice(0, 4)
                .map((l) => (
                  <Link
                    key={l.id}
                    to="/listings/$id"
                    params={{ id: l.id }}
                    className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 hover:text-cyan-400 transition-colors"
                  >
                    <span className="text-sm">{l.title}</span>
                    <span className="text-sm text-gray-400">
                      {(l.price / 100).toFixed(2)} €
                    </span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
