from app.services.llm_prompts import build_extraction_prompt


def test_prompt_includes_text():
    prompt = build_extraction_prompt("Texte CV de test")
    assert "Texte CV de test" in prompt


def test_prompt_includes_all_aspect_sections():
    prompt = build_extraction_prompt("foo")
    for section in ["ACTION:", "STEPS:", "PERSONA:", "EXAMPLES:", "CONTEXT:", "CONSTRAINTS:", "TEMPLATE:"]:
        assert section in prompt


def test_prompt_includes_enum_values():
    prompt = build_extraction_prompt("foo")
    for niveau in ["debutant", "intermediaire", "avance", "expert"]:
        assert niveau in prompt
    for cefr in ["A1", "A2", "B1", "B2", "C1", "C2", "natif"]:
        assert cefr in prompt


def test_prompt_forbids_invention_of_resume():
    prompt = build_extraction_prompt("foo")
    assert "Ne génère JAMAIS un résumé" in prompt
