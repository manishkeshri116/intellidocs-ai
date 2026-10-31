"""add user_id to documents

Revision ID: 840bd81eae27
Revises: 
Create Date: 2026-10-31 13:02:21.086502

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '840bd81eae27'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "documents",
        sa.Column("user_id", sa.Integer(), nullable=True)
    )

    op.create_index(
        "ix_documents_user_id",
        "documents",
        ["user_id"],
        unique=False
    )

    op.create_foreign_key(
        "fk_documents_user_id_users",
        "documents",
        "users",
        ["user_id"],
        ["id"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_documents_user_id_users",
        "documents",
        type_="foreignkey"
    )

    op.drop_index(
        "ix_documents_user_id",
        table_name="documents"
    )

    op.drop_column("documents", "user_id")