import {
  Link,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { deleteListing } from "@/domain/listing/functions";
import { signOut } from "@/lib/auth-client";
import { getSession } from "@/lib/session";
import { posthog } from "@/lib/posthog";
import { myListingsQueryOptions } from "@/lib/queries";
import { CreateListingForm } from "@/components/CreateListingForm";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/login" });
    return { user: session.user };
  },
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(myListingsQueryOptions),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: listings } = useSuspenseQuery(myListingsQueryOptions);

  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    posthog.identify(user.id, { email: user.email });
  }, [user.id, user.email]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteListing({ data: id }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: myListingsQueryOptions.queryKey });
      const previous = queryClient.getQueryData(myListingsQueryOptions.queryKey);
      queryClient.setQueryData(myListingsQueryOptions.queryKey, (old = []) =>
        old.filter((l) => l.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(myListingsQueryOptions.queryKey, ctx?.previous);
    },
    onSuccess: (_result, id) => {
      posthog.capture("listing_deleted", { listingId: id });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: myListingsQueryOptions.queryKey });
    },
  });

  async function handleDelete(id: string) {
    await deleteMutation.mutateAsync(id);
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
          <CreateListingForm
            userId={user.id}
            onSuccess={() => setShowForm(false)}
          />
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
                  disabled={deleteMutation.isPending}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
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
