"""ajouter_bac_a_sable_demo

Revision ID: e1a7c4d90b32
Revises: c3d34466ba04
Create Date: 2026-08-31 06:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1a7c4d90b32"
down_revision: Union[str, None] = "c3d34466ba04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "demo_sandboxes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("expire_le", sa.DateTime(timezone=True), nullable=False),
        sa.Column("adresse_creation", sa.String(length=64), nullable=False),
        sa.Column("appels_ia", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "cree_le", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_demo_sandboxes_expire_le", "demo_sandboxes", ["expire_le"])

    op.create_table(
        "demo_quota_jour",
        sa.Column("jour", sa.Date(), nullable=False),
        sa.Column("appels", sa.Integer(), server_default="0", nullable=False),
        sa.PrimaryKeyConstraint("jour"),
    )

    # ON DELETE CASCADE : effacer le bac emporte ses comptes, donc — par les
    # cascades déjà en place — les professeurs, CV, compétences et embeddings.
    for table in ("users", "sessions"):
        op.add_column(table, sa.Column("sandbox_id", sa.BigInteger(), nullable=True))
        op.create_index(f"ix_{table}_sandbox_id", table, ["sandbox_id"])
        op.create_foreign_key(
            f"fk_{table}_sandbox_id",
            table,
            "demo_sandboxes",
            ["sandbox_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    for table in ("sessions", "users"):
        op.drop_constraint(f"fk_{table}_sandbox_id", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_sandbox_id", table_name=table)
        op.drop_column(table, "sandbox_id")

    op.drop_table("demo_quota_jour")
    op.drop_index("ix_demo_sandboxes_expire_le", table_name="demo_sandboxes")
    op.drop_table("demo_sandboxes")
