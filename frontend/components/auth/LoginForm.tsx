"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@/components/auth/AuthProvider";
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
import { ApiError } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [notActivated, setNotActivated] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setNotActivated(false);
    try {
      const user = await login(values.email, values.password);
      router.push(`/dashboard/${user.role}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setNotActivated(true);
      } else {
        toast.error(e instanceof Error ? e.message : "Erreur de connexion");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex w-full max-w-[360px] flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-sm font-medium text-fg">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
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
          name="password"
          render={({ field }) => (
            <FormItem className="gap-1.5">
              <FormLabel className="text-sm font-medium text-fg">Mot de passe</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
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
          className="mt-2 w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-active hover:bg-primary-dark"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
        </Button>
        {notActivated && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Votre compte n&apos;est pas encore activé. Utilisez le lien d&apos;activation que l&apos;administrateur vous a transmis, ou demandez-lui d&apos;en générer un nouveau.
          </div>
        )}
      </form>
    </Form>
  );
}
