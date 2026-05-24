"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api/auth";
import { activationApi } from "@/lib/api/activation";

const schema = z
  .object({
    password: z.string().min(8, "8 caractères minimum"),
    confirm: z.string().min(8, "8 caractères minimum"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Les deux mots de passe doivent être identiques",
    path: ["confirm"],
  });

type FormValues = z.infer<typeof schema>;

export function ActivateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <div className="mt-8 max-w-[360px] space-y-3">
        <p className="text-sm text-destructive">
          Lien d&apos;activation invalide : aucun jeton fourni.
        </p>
        <Link
          href="/login"
          className="text-sm text-primary underline underline-offset-2"
        >
          Retour à la page de connexion
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await activationApi.activate({
        token,
        password: values.password,
      });
      localStorage.setItem("access_token", res.access_token);
      const me = await authApi.me();
      toast.success("Compte activé. Bienvenue !");
      router.push(`/dashboard/${me.role}`);
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Activation échouée. Demandez un nouveau lien à l'administrateur."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-8 flex w-full max-w-[360px] flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-sm font-medium text-fg">
                Nouveau mot de passe
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="rounded-md border-border bg-surface px-4 py-3 text-sm placeholder:text-fg-subtle"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-sm font-medium text-fg">
                Confirmation
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="rounded-md border-border bg-surface px-4 py-3 text-sm placeholder:text-fg-subtle"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-active hover:bg-primary/95"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Définir mon mot de passe"
          )}
        </Button>
      </form>
    </Form>
  );
}
