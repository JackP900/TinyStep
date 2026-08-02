import os 
import json 
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

client = Anthropic(api_key=ANTHROPIC_API_KEY)

DECOMPOSITION_PROMPT = """
You help students with ADHD. Your goal is to take in assignments and break it down into 4 - 7 smaller, more manageable sub-problems.

The first step must be very trivial, under 2 minutes, no thinking, no decisions, no research. no single step should take longer than
10 minutes. The student should know for certain when each step is done. Ignore grades and deadlines and never bring them up, as that 
creates unwanted pressure. Your tone should be warm and shame-free.

<example input>
Write a 5-page essay on the causes of WW1 for History class, due Friday.
<example input>

<example output>
["Open a blank Google doc", "Type the essay title at the top of the document", "write one short bullet point", "write two rough sentences
naming a single cause of the war", "Jot down three more causes as short bullet points", "Write two rough sentences about the first cause
on your list"]
<example output>

<bad output>
this assignment is due tomorrow! step 1: quickly research vectors and complete a couple questions, step 2: brainstorm this idea, you need
to do this quickly!
<bad output>

Respond with only a JSON array of strings, nothing else. One step per element, no numbering, no text before or after the array. 
"""


def breakdown(assignment):
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        system=DECOMPOSITION_PROMPT,
        messages=[{"role": "user", "content": assignment}],
    )

    text = response.content[0].text
    steps = json.loads(text)
    return steps

