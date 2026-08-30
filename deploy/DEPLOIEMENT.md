# Déploiement de ProfMatch

Front Next.js sur **Vercel** (edge de Montréal), API et worker Celery sur le
**VPS Hetzner** de Nuremberg, aux côtés des six autres projets. Règle de partage :
ce qui est sans état va sur Vercel, ce qui écrit reste sur le VPS.

## Topologie

| Élément | Où | Nom |
|---|---|---|
| Front Next.js | Vercel | `profmatch.soultaka.com` |
| API FastAPI | VPS, derrière Caddy | `profmatch-api.soultaka.com` |
| Worker Celery | VPS, sans exposition réseau | `profmatch-worker` |
| PostgreSQL 16 | socle partagé | base `profmatch`, rôle `profmatch` |
| Redis 7 | socle partagé | **base 1** (voir plus bas) |

Le front est **entièrement statique** : 17 routes prérendues, aucune fonction
serverless. Tout l'état transite par l'API, appelée depuis le navigateur.

## Pourquoi les services ne s'appellent pas `api` et `worker`

Le réseau Docker `socle` est partagé entre les sept projets et Docker y publie
un alias par nom de service. Deux projets nommant leur worker `worker` se
marcheraient dessus. D'où `profmatch-api` et `profmatch-worker`.

**ProfMatch est le premier projet à poser un worker** : la convention se fixe ici.

## Pourquoi Redis en base 1

Le Redis du socle est partagé. Une base logique par projet évite qu'un
`FLUSHDB` ou une collision de clés d'un projet n'atteigne la file d'un autre.
Devis BTP n'utilise pas Redis ; ProfMatch prend la **base 1** et laisse la 0
libre. Le Redis du socle est protégé par mot de passe : `REDIS_URL` doit donc
porter la forme `redis://:<mot_de_passe>@redis:6379/1`.

`maxmemory-policy noeviction` est réglé au socle : une file Celery ne doit
jamais perdre une tâche en silence parce que la mémoire est pleine.

## Migrations et ordre de démarrage

`entrypoint.sh` applique `alembic upgrade head` **uniquement** quand la commande
est `uvicorn` — donc dans l'API, jamais dans le worker. Le worker attend en
conséquence `profmatch-api: service_healthy`, pour ne pas travailler sur un
schéma incomplet.

## Pourquoi une réécriture `/api` plutôt que du CORS

`frontend/vercel.json` réécrit `/api/:chemin*` vers
`https://profmatch-api.soultaka.com/api/:chemin*`. Le préfixe `/api` est
**conservé** : les routers FastAPI sont déjà montés sous `/api`.

Le navigateur ne voit aucun changement d'origine : pas de configuration CORS à
maintenir, et surtout pas de requête `OPTIONS` de préflight avant chaque POST.

Mesuré sur Devis BTP, même topologie : la réécriture répond en **241–310 ms**
au premier octet contre **479–647 ms** en appel direct depuis Ottawa. La
poignée TLS se paie à 23 ms sur l'edge au lieu de 130 ms × trois allers-retours
vers Nuremberg. **La réécriture n'est pas qu'un contournement du préflight,
c'est un gain net.**

`FRONTEND_URL` reste renseigné côté API : le middleware CORS liste alors
l'origine explicitement — jamais `*`, ce que `allow_credentials=True` interdit.

## Garde sur le cache de l'edge

Vercel peut mettre en cache les réponses d'une réécriture externe. Sur une API
authentifiée, une réponse mise en cache serait servie au visiteur suivant.
Mesure faite sur Devis BTP : `x-vercel-cache: MISS` à chaque appel, l'API
n'émettant aucun en-tête de cache. La garde
`x-vercel-enable-rewrite-caching: 0` est néanmoins posée dans `vercel.json` —
elle ne coûte rien et ne dépend pas du comportement par défaut de la plateforme.

## `NEXT_PUBLIC_API_URL` n'est pas à définir sur Vercel

`NEXT_PUBLIC_*` est inliné dans les bundles au moment du `next build`. Plutôt
que d'exiger une variable au tableau de bord — que le connecteur Vercel ne sait
pas poser — `lib/api/client.ts` retombe sur la **chaîne vide en production**,
c'est-à-dire sur l'origine courante, donc sur la réécriture.

L'image Docker fournit toujours `NEXT_PUBLIC_API_URL` par un `ARG` : la pile
`docker compose up` locale garde son comportement d'origine.

## Comptes de démonstration

`SEED_DEMO_ACCOUNTS_ON_START=true` crée les trois comptes `prof` / `rh` /
`admin` au démarrage (idempotent, échec non bloquant). Assumé : ce déploiement
est une vitrine de portfolio destinée à être essayée, pas un service avec de
vrais utilisateurs. À basculer sur `false` si cela change.

## Secrets

`deploy/profmatch.env`, en `600`, **jamais dans le dépôt** — `.gitignore` porte
déjà `*.env`, ce qui compte : le dépôt est cloné sur le VPS à côté du fichier.
Mots de passe du socle dans `/srv/socle/.env` et `/srv/socle/bases.env`.

## Lancer

```bash
cd /srv/projets/profmatch/deploy
docker compose -f docker-compose.socle.yml up -d --build
docker compose -f docker-compose.socle.yml ps
```

Puis ajouter le bloc au `/srv/socle/caddy/Caddyfile` :

```
profmatch-api.soultaka.com {
	reverse_proxy profmatch-api:8000
}
```

et recharger Caddy. **Le Caddyfile est monté en répertoire, pas en fichier** :
un montage de fichier unique reste accroché à l'ancien inode après un `sed -i`,
et le rechargement semble réussir sans effet.
