# AFARIS — Gestion Absences/Retards (V4)
- Animations & couleurs (Tailwind + Framer Motion)
- **Page de connexion admin** (mot de passe côté front)
- Logo texte **AFARIS**

## Lancer
```bash
npm install
npm run dev
```

## Mot de passe admin
Par défaut: `admin123`. Pour changer, créez un fichier `.env.local` à la racine:
```
VITE_ADMIN_PASSWORD=mon_super_mdp
```
Re-lancez `npm run dev`.

⚠️ Auth front-end uniquement (pas sécurisé pour données sensibles). Pour du vrai sécurisé: auth serveur (ex. Supabase Auth).
