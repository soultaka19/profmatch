"""ajouter colonne justification_statut sur affectations

Revision ID: c3d34466ba04
Revises: 2511bfa21303
Create Date: 2026-05-28 16:44:23.317457

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3d34466ba04'
down_revision: Union[str, None] = '2511bfa21303'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajoute justification_statut sur affectations + initialise les rangées existantes.

    L'enum est créé explicitement avant l'ajout de colonne pour qu'un downgrade
    propre puisse le supprimer. Les affectations existantes héritent du défaut
    `statique` (server_default) — cohérent avec ce qui a été persisté avant ce
    refactor (justification statique posée par la phase 2 initiale).
    """
    justif_statut_enum = sa.Enum(
        'statique', 'en_cours', 'enrichie', 'echec',
        name='justification_statut',
    )
    justif_statut_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        'affectations',
        sa.Column(
            'justification_statut',
            justif_statut_enum,
            server_default='statique',
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('affectations', 'justification_statut')
    sa.Enum(name='justification_statut').drop(op.get_bind(), checkfirst=True)
