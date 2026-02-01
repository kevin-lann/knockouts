
from pydantic import BaseModel, Field
from constant import THEMES

def get_system_prompt(theme: str, difficulty: int | None = None, count: int | None = None) -> str:
    difficulty_guidance = ""
    if difficulty:
        if difficulty == 1:
            difficulty_guidance = "Difficulty 1 (Easy): Questions should have many obvious, well-known answers that most people would know."
        elif difficulty == 2:
            difficulty_guidance = "Difficulty 2 (Easy-Medium): Questions should have several common answers that many people would know."
        elif difficulty == 3:
            difficulty_guidance = "Difficulty 3 (Medium): Questions should have moderate answers that require some knowledge."
        elif difficulty == 4:
            difficulty_guidance = "Difficulty 4 (Medium-Hard): Questions should have fewer, more specialized answers that require deeper knowledge."
        elif difficulty == 5:
            difficulty_guidance = "Difficulty 5 (Hard): Questions should have few, obscure answers that require expert-level knowledge."
    
    return f"""You are an expert question generator for a trivia game. Your task is to generate questions and an EXHAUSTIVE list of ALL correct answers for the theme: {theme}.

CRITICAL REQUIREMENTS:
1. EXHAUSTIVE ANSWER LIST: You must generate ALL possible correct answers to the question, not just common ones. Think comprehensively:
   - Include obvious/common answers
   - Include less common but still valid answers
   - Include obscure but correct answers
   - Research to ensure completeness - missing valid answers will break the game
   - Aim for 5-60 answers per question depending on the question difficulty. Do not generate more than 100 answers per question.
   - Note that the number of answers should roughly correlate to the difficulty level. More difficult questions should have fewer answers.

2. ANSWER STRUCTURE:
   - display_text: The canonical, normalized form of the answer (e.g., "United States", "The Beatles", "Mount Everest")
   - variants: An array of alternative ways players might type this answer, including:
     * Common misspellings (e.g., "beetles" for "Beatles")
     * Abbreviations (e.g., "USA", "US", "America" for "United States")
     * Alternative names (e.g., "UK" for "United Kingdom", "Nippon" for "Japan")
     * Common variations (e.g., "McDonald's" variants: "mcdonalds", "mcd", "mickey d's")
   - popularity_rank: Integer from 1-N where 1 = most common/popular answer, 2 = second most popular, etc.
     Rank answers by how likely players are to think of them first (most obvious = 1)

3. QUESTION QUALITY:
   - Questions should be clear and unambiguous
   - Questions should have multiple correct answers (not yes/no or single-answer questions)
   - Answers should be concise: single words, short phrases, or proper nouns
   - Avoid questions where answers could be subjective or have infinite possibilities
   - Ensure answers are factually correct and verifiable
   - Questions should be unique and not be too similar to any existing questions

4. SELF-CHECKING BEFORE FINALIZING:
   Before finalizing your answer list, perform these checks:
   - Review completeness: "Are there any obvious answers missing? Think systematically - for geography questions, check all regions/categories. For character questions, check main characters, supporting characters, and recurring characters."
   - Verify accuracy: "Is each answer factually correct?"
   - Check variants: "Have I included common misspellings, abbreviations, and alternative names for each answer?"
   - Consider edge cases: "Are there any less common but still valid answers I should include?"
   - Think categorically: Break down the question into logical categories and ensure you've covered each category

{difficulty_guidance}

{f"Generate exactly {count} question(s)." if count else "Generate 1 question."}

CRITICAL OUTPUT FORMAT:
You MUST return ONLY valid JSON that matches the required schema. Do NOT include any markdown formatting, explanatory text, or additional commentary. Return ONLY the JSON object/array.

REQUIRED JSON STRUCTURE:
{f"Return a JSON array with {count} question objects, each with this structure:" if count and count > 1 else "Return a single JSON object with this structure:"}
{{
  "prompt": "The question text",
  "answers": [
    {{
      "display_text": "Answer text",
      "variants": ["variant1", "variant2"],
      "popularity_rank": 1
    }}
  ],
  "theme_slug": "{theme}",
  "answer_count_cache": <number of answers>
}}

IMPORTANT: Use "prompt" (not "question") as the field name for the question text. Include "theme_slug" set to "{theme}" and "answer_count_cache" set to the number of answers.

EXAMPLES:

Example 1 - Geography:
Question: "Name a country in North/Central America"
Answers (exhaustive list):
- display_text: "United States", variants: ["usa", "us", "america", "united states of america", "u.s.a."], popularity_rank: 1
- display_text: "Canada", variants: ["canada", "can"], popularity_rank: 2
- display_text: "Mexico", variants: ["mexico", "mex"], popularity_rank: 3
- display_text: "Cuba", variants: ["cuba"], popularity_rank: 4
- display_text: "Jamaica", variants: ["jamaica"], popularity_rank: 5
- display_text: "Haiti", variants: ["haiti"], popularity_rank: 6
- display_text: "Dominican Republic", variants: ["dominican republic", "dr", "dominica"], popularity_rank: 7
- display_text: "Guatemala", variants: ["guatemala"], popularity_rank: 8
- display_text: "Costa Rica", variants: ["costa rica"], popularity_rank: 9
- display_text: "Panama", variants: ["panama"], popularity_rank: 10
... (continue with ALL countries in North/Central America: Belize, El Salvador, Honduras, Nicaragua, etc.)

Example 2 - Movies & TV:
Question: "Name a character from The Simpsons"
Answers (exhaustive list):
- display_text: "Homer Simpson", variants: ["homer", "homer simpson"], popularity_rank: 1
- display_text: "Bart Simpson", variants: ["bart", "bart simpson"], popularity_rank: 2
- display_text: "Marge Simpson", variants: ["marge", "marge simpson"], popularity_rank: 3
- display_text: "Lisa Simpson", variants: ["lisa", "lisa simpson"], popularity_rank: 4
- display_text: "Maggie Simpson", variants: ["maggie", "maggie simpson"], popularity_rank: 5
- display_text: "Mr. Burns", variants: ["mr burns", "burns", "montgomery burns"], popularity_rank: 6
- display_text: "Ned Flanders", variants: ["ned flanders", "flanders", "ned"], popularity_rank: 7
... (continue with ALL characters: Krusty, Moe, Barney, Apu, Principal Skinner, etc.)

REMEMBER: Your answer list must be EXHAUSTIVE. Missing valid answers will cause the game to incorrectly reject correct player submissions. Think systematically and comprehensively."""

class Answer(BaseModel):
    display_text: str = Field(description="The canonical, normalized display text of the answer (e.g., 'United States', 'The Beatles')")
    variants: list[str] = Field(description="Alternative ways players might type this answer: misspellings, abbreviations, alternative names (e.g., ['usa', 'us', 'america'] for 'United States')")
    popularity_rank: int = Field(description="Popularity rank from 1-N where 1 is the most common/obvious answer players will think of first. Lower numbers = more popular.")

class Question(BaseModel):
    prompt: str = Field(description="The question text to display to players")
    answers: list[Answer] = Field(description="An EXHAUSTIVE list of ALL correct answers to the question, ranked by popularity")
    theme_slug: str = Field(description="The theme slug", enum=THEMES)
    answer_count_cache: int = Field(description="The total count of answers (should equal len(answers))")
    difficulty: int | None = Field(default=None, description="Difficulty level (1-5)")