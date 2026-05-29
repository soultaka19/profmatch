import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// eslint-config-next v16 expose une config plate native (ESLint 9), sans le
// patch @rushstack/eslint-patch qui cassait l'ancien FlatCompat sous ESLint 9.
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    rules: {
      // Règle introduite par react-hooks v7 (tirée par eslint-config-next v16).
      // Elle signale des patterns légitimes et déjà répandus dans la base
      // (init de formulaire à l'ouverture d'un dialog, lecture localStorage au
      // montage). Jamais appliquée jusqu'ici → on la garde en avertissement
      // (visible, non bloquant) plutôt que d'imposer un refactor transverse.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
