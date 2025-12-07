from openai import OpenAI

from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)


def rewrite_text(text: str, tone: str = "professional", purpose: str = "cold_outreach") -> str:
    """
    Rewrite text using OpenAI to improve it based on tone and purpose.

    Args:
        text: The original text to rewrite
        tone: One of 'friendly', 'professional', 'punchy'
        purpose: One of 'cold_outreach', 'follow_up'

    Returns:
        The rewritten text
    """
    tone_descriptions = {
        "friendly": "warm, approachable, and conversational",
        "professional": "polished, clear, and business-appropriate",
        "punchy": "direct, impactful, and attention-grabbing",
    }

    purpose_descriptions = {
        "cold_outreach": "reaching out to someone for the first time",
        "follow_up": "following up on a previous conversation or email",
    }

    tone_desc = tone_descriptions.get(tone, tone_descriptions["professional"])
    purpose_desc = purpose_descriptions.get(purpose, purpose_descriptions["cold_outreach"])

    prompt = f"""Rewrite the following email text to be {tone_desc}.
The purpose is {purpose_desc}.

Keep any template variables like {{{{first_name}}}} or {{{{company}}}} intact.
Only return the rewritten text, nothing else.

Original text:
{text}"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You are an expert email copywriter. Rewrite emails to be more effective while maintaining the core message.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=1000,
    )

    return response.choices[0].message.content.strip()
