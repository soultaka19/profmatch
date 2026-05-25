"""add_cv_source_column

Revision ID: 841f44d9c325
Revises: 24bfb831e444
Create Date: 2026-05-25 10:45:24.361165

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '841f44d9c325'
down_revision: Union[str, None] = '24bfb831e444'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_cvsource = sa.Enum("upload", "manual", name="cvsource")


def upgrade() -> None:
    _cvsource.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "cvs",
        sa.Column(
            "source",
            _cvsource,
            nullable=False,
            server_default="upload",
        ),
    )


def downgrade() -> None:
    op.drop_column("cvs", "source")
    _cvsource.drop(op.get_bind(), checkfirst=True)
