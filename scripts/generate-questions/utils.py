import re
import json

def extract_json(text: str) -> dict | list:
        """Extract JSON from response text, handling markdown code blocks if present."""
        # Try to find JSON in markdown code blocks first
        json_match = re.search(r'```(?:json)?\s*(\{.*\}|\[.*\])\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Find the first { or [ and try to extract complete JSON from there
        # Use a bracket matching approach
        start_chars = {'{': '}', '[': ']'}
        for i, char in enumerate(text):
            if char in start_chars:
                end_char = start_chars[char]
                depth = 0
                for j in range(i, len(text)):
                    if text[j] == char:
                        depth += 1
                    elif text[j] == end_char:
                        depth -= 1
                        if depth == 0:
                            # Found complete JSON structure
                            try:
                                return json.loads(text[i:j+1])
                            except json.JSONDecodeError:
                                break
                break
        
        # Fallback: try parsing the whole text
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass
        
        # If all else fails, raise an error with the text
        raise ValueError(f"Could not extract valid JSON from response. Response text:\n{text[:500]}")