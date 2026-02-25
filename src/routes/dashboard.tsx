import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  createListing,
  deleteListing,
  listMyListings,
} from "@/domain/listing/functions";
import { signOut } from "@/lib/auth-client";
import { getSession } from "@/lib/auth.server";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    return { user: session.user };
  },
  loader: async () => {
    const listings = await listMyListings();
    return { listings };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { listings } = Route.useLoaderData();
  const router = useRouter();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<
    "new" | "like_new" | "good" | "fair"
  >("good");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    await createListing({
      data: {
        title,
        description,
        price: Math.round(parseFloat(price) * 100),
        condition,
      },
    });
    setShowForm(false);
    setTitle("");
    setDescription("");
    setPrice("");
    setSubmitting(false);
    router.invalidate();
  }

  async function handleDelete(id: string) {
    await deleteListing({ data: id });
    router.invalidate();
  }

  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");

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

        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Actives", value: active.length },
            { label: "Vendues", value: sold.length },
            { label: "Total", value: listings.length },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700"
            >
              <p className="text-gray-400 text-sm">{s.label}</p>
              <p className="text-3xl font-bold mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Mes annonces</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? "Annuler" : "+ Nouvelle annonce"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">
                  Titre
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="One Piece Vol. 1"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Prix (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="5.00"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">État</label>
                <select
                  value={condition}
                  onChange={(e) =>
                    setCondition(e.target.value as typeof condition)
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="new">Neuf</option>
                  <option value="like_new">Comme neuf</option>
                  <option value="good">Bon état</option>
                  <option value="fair">État correct</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {submitting ? "..." : "Publier"}
            </button>
          </form>
        )}

        {listings.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
            <p className="text-gray-400">Aucune annonce pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => (
              <div
                key={l.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <Link
                    to="/listings/$id"
                    params={{ id: l.id }}
                    className="font-medium hover:text-cyan-400 transition-colors"
                  >
                    {l.title}
                  </Link>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {(l.price / 100).toFixed(2)} € · {l.condition} ·{" "}
                    <span
                      className={
                        l.status === "active"
                          ? "text-green-400"
                          : "text-gray-500"
                      }
                    >
                      {l.status}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
