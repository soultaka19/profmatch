"""add_affectation_origine_column

Revision ID: 2511bfa21303
Revises: 841f44d9c325
Create Date: 2026-05-25 13:42:52.214222

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision / down_revision : conserver ceux générés par le scaffold (down_revision='841f44d9c325')

revision: str = '2511bfa21303'
down_revision: Union[str, None] = '841f44d9c325'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_origine = sa.Enum("algo", "manuel", name="affectation_origine")


def upgrade() -> None:
    _origine.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "affectations",
        sa.Column(
            "origine",
            _origine,
            nullable=False,
            server_default="algo",
        ),
    )


def downgrade() -> None:
    op.drop_column("affectations", "origine")
    _origine.drop(op.get_bind(), checkfirst=True)
