# Polices des tests navigateur (L259 r1)

Fichiers servis par `src/testing/polices-locales.ts` à la place de Google Fonts dans les e2e : la mise en page se
mesure avec la police que voit l'utilisateur, sans réseau. Jamais copiés dans l'application construite.

| Fichier | Police | Source | Licence |
|---|---|---|---|
| `cinzel-latin.woff2` | Cinzel v26 (variable 400–900), sous-ensemble latin | Google Fonts, `fonts.gstatic.com/s/cinzel/v26/8vIJ7ww63mVu7gt79mT7.woff2` | SIL Open Font License 1.1 — Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel) |
| `inter-latin.woff2` | Inter v20 (variable), sous-ensemble latin | Google Fonts, `fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2` | SIL Open Font License 1.1 — Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter) |

Texte de la licence : https://openfontlicense.org/open-font-license-official-text/

Récupérés le 2026-11-25. Si `index.html` change de graisses ou de familles, mettre `POLICES` de `polices-locales.ts` à jour.
