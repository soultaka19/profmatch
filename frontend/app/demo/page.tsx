import { DemoEntry } from "@/components/demo/DemoEntry";

export const metadata = {
  title: "Démonstration — ProfMatch",
  description: "Essayer ProfMatch sans compte : trois rôles, une heure, aucune inscription.",
};

export default function DemoPage() {
  return <DemoEntry />;
}
