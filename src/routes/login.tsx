import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, signIn, signUp } from "@/lib/auth-client";
import { getSession } from "@/lib/auth.server";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getSession();
    if (session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

type Tab = "password" | "magic";
type Mode = "login" | "register";

function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("password");
  const [mode, setMode] = useState<Mode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "register") {
        const res = await signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      await router.invalidate();
      router.navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.magicLink({ email });
      if (res.error) throw new Error(res.error.message);
      setInfo(
        "Lien envoyé ! Vérifie ta console serveur (dev) ou ta boîte mail (prod).",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-black text-center mb-8">Lister</h1>

        {/* Tabs */}
        <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
          {(["password", "magic"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setError(null);
                setInfo(null);
              }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-cyan-500 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t === "password" ? "Email / Mot de passe" : "Magic Link"}
            </button>
          ))}
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          {tab === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Jean Dupont"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="toi@exemple.fr"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg font-semibold transition-colors"
              >
                {loading
                  ? "..."
                  : mode === "login"
                    ? "Se connecter"
                    : "Créer un compte"}
              </button>

              <p className="text-center text-sm text-gray-400">
                {mode === "login"
                  ? "Pas encore de compte ? "
                  : "Déjà un compte ? "}
                <button
                  type="button"
                  onClick={() =>
                    setMode(mode === "login" ? "register" : "login")
                  }
                  className="text-cyan-400 hover:underline"
                >
                  {mode === "login" ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
              <p className="text-gray-400 text-sm">
                On t'envoie un lien de connexion par email. Pas de mot de passe.
              </p>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="toi@exemple.fr"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              {info && <p className="text-cyan-400 text-sm">{info}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg font-semibold transition-colors"
              >
                {loading ? "..." : "Envoyer le lien"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
