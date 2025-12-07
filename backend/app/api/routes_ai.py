from fastapi import APIRouter, Depends, HTTPException, status

from app import models
from app.core.openai_client import rewrite_text
from app.core.security import get_current_user
from app.schemas import RewriteRequest, RewriteResponse

router = APIRouter()


@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_email_text(
    data: RewriteRequest,
    current_user: models.User = Depends(get_current_user),
) -> RewriteResponse:
    """
    Rewrite text using AI to improve it based on tone and purpose.

    Supported tones: friendly, professional, punchy
    Supported purposes: cold_outreach, follow_up
    """
    valid_tones = ["friendly", "professional", "punchy"]
    valid_purposes = ["cold_outreach", "follow_up"]

    if data.tone not in valid_tones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tone. Must be one of: {', '.join(valid_tones)}",
        )

    if data.purpose not in valid_purposes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid purpose. Must be one of: {', '.join(valid_purposes)}",
        )

    if not data.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty",
        )

    try:
        rewritten = rewrite_text(
            text=data.text,
            tone=data.tone,
            purpose=data.purpose,
        )
        return RewriteResponse(rewritten=rewritten)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rewrite text: {str(e)}",
        )
