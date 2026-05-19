import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-creme">
      <div className="w-full max-w-sm space-y-6 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-bordeaux">ProfMatch</h1>
          <p className="text-sm text-muted-foreground">Connexion</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
