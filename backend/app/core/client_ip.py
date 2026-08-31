"""Adresse du visiteur derrière la chaîne Vercel → Caddy → conteneur.

`X-Forwarded-For` ne sert à rien ici : Caddy, sans `trusted_proxies`, tient son
interlocuteur direct pour le client et **remplace** l'en-tête par l'adresse de
l'edge Vercel — qui alterne d'une requête à l'autre. Toute limite par IP fondée
dessus tombe donc dans un compteur différent à chaque appel (mesuré : 5 créations
acceptées là où 3 étaient permises).

`X-Vercel-Forwarded-For`, que Caddy ne connaît pas, traverse intact et porte
l'adresse réelle. On le préfère, puis on retombe sur `X-Forwarded-For` (appel
direct sur le domaine de l'API), puis sur l'adresse de la connexion.
"""

from fastapi import Request

_ENTETES = ("x-vercel-forwarded-for", "x-forwarded-for")


def adresse_visiteur(request: Request) -> str:
    for nom in _ENTETES:
        brut = request.headers.get(nom)
        if not brut:
            continue
        premier = brut.split(",")[0].strip()
        if premier:
            return premier[:64]

    client = request.client
    return client.host[:64] if client is not None else "inconnu"
