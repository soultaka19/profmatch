"""add_semestres_admission_to_programmes

Revision ID: 24bfb831e444
Revises: a0f6c61f68c2
Create Date: 2026-05-24 17:00:28.747950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '24bfb831e444'
down_revision: Union[str, None] = 'a0f6c61f68c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Le type enum 'semestre' existe déjà (créé par la migration des sessions).
    # On le réutilise sans tenter de le recréer.
    semestre_enum = postgresql.ENUM(
        'printemps', 'ete', 'automne', 'hiver',
        name='semestre',
        create_type=False,
    )
    op.add_column(
        'programmes',
        sa.Column(
            'semestres_admission',
            postgresql.ARRAY(semestre_enum),
            server_default=sa.text("ARRAY['automne']::semestre[]"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column('programmes', 'semestres_admission')
