import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { Condition } from "@/lib/typesense-search";
import type { CreateListingFormInput } from "@/domain/listing/repository";
import { createListing } from "@/domain/listing/functions";
import { posthog } from "@/lib/posthog";
import { myListingsQueryOptions } from "@/lib/queries";
import { CONDITIONS, CONDITION_LABELS } from "@/lib/typesense-search";

const listingSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z
    .string()
    .min(10, "Description trop courte (10 caractères min)"),
  price: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Prix invalide"),
  condition: z.enum(CONDITIONS),
});

interface CreateListingFormProps {
  userId: string;
  onSuccess: () => void;
}

export function CreateListingForm({
  userId,
  onSuccess,
}: CreateListingFormProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateListingFormInput) => createListing({ data }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: myListingsQueryOptions.queryKey,
      });
      const previous = queryClient.getQueryData(
        myListingsQueryOptions.queryKey,
      );
      queryClient.setQueryData(myListingsQueryOptions.queryKey, (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          ...input,
          status: "active" as const,
          userId,
          categoryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      queryClient.setQueryData(myListingsQueryOptions.queryKey, ctx?.previous);
    },
    onSuccess: (created) => {
      queryClient.setQueryData(myListingsQueryOptions.queryKey, (old = []) =>
        old.map((l) => (l.id.startsWith("temp-") ? created : l)),
      );
      posthog.capture("listing_created", {
        title: created.title,
        price: created.price,
        condition: created.condition,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: myListingsQueryOptions.queryKey,
      });
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      price: "",
      condition: "good" as Condition,
    },
    validators: {
      onSubmit: listingSchema,
    },
    onSubmit: async ({ value }) => {
      const price = Math.round(parseFloat(value.price) * 100);
      await mutation.mutateAsync({ ...value, price });
      onSuccess();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <form.Field name="title">
          {(field) => (
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Titre</label>
              <input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="One Piece Vol. 1"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              {field.state.meta.errors
                .filter((err) => err != null)
                .map((err) => (
                  <p key={err.message} className="text-red-400 text-xs mt-1">
                    {err.message}
                  </p>
                ))}
            </div>
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">
                Description
              </label>
              <textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              {field.state.meta.errors
                .filter((err) => err != null)
                .map((err) => (
                  <p key={err.message} className="text-red-400 text-xs mt-1">
                    {err.message}
                  </p>
                ))}
            </div>
          )}
        </form.Field>

        <form.Field name="price">
          {(field) => (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Prix (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="5.00"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
              {field.state.meta.errors
                .filter((err) => err != null)
                .map((err) => (
                  <p key={err.message} className="text-red-400 text-xs mt-1">
                    {err.message}
                  </p>
                ))}
            </div>
          )}
        </form.Field>

        <form.Field name="condition">
          {(field) => (
            <div>
              <label className="block text-sm text-gray-400 mb-1">État</label>
              <select
                value={field.state.value}
                onChange={(e) =>
                  field.handleChange(e.target.value as Condition)
                }
                onBlur={field.handleBlur}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {CONDITION_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form.Field>
      </div>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg font-semibold transition-colors"
          >
            {isSubmitting || mutation.isPending ? "..." : "Publier"}
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}
