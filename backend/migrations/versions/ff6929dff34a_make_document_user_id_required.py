"""make document user_id required

Revision ID: ff6929dff34a
Revises: 840bd81eae27
Create Date: 2026-10-31 13:06:03.338013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff6929dff34a'
down_revision: Union[str, Sequence[str], None] = '840bd81eae27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "documents",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        "documents",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True
    )