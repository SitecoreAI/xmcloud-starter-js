import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
    ...nextCoreWebVitals,
    ...nextTypeScript,
    {
        rules: {
            // Sitecore media fields provide image alternative text at authoring time.
            "jsx-a11y/alt-text": "off",
            "no-console": ["warn", { allow: ["error"] }],
            // This starter does not enable the React Compiler. Its inherited
            // components can adopt these compiler migration rules separately.
            "react-hooks/error-boundaries": "off",
            "react-hooks/immutability": "off",
            "react-hooks/purity": "off",
            "react-hooks/refs": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/static-components": "off",
            "react-hooks/use-memo": "off",
        },
    },
    globalIgnores([
        "node_modules/**",
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        ".sitecore/**",
    ]),
]);
