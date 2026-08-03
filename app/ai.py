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
</example output>

<bad output>
this assignment is due tomorrow! step 1: quickly research vectors and complete a couple questions, step 2: brainstorm this idea, you need
to do this quickly!
</bad output>

Respond with only a JSON array of strings, nothing else. One step per element, no numbering, no text before or after the array. 
"""


REBREAK_PROMPT = """
You help students with ADHD who are stuck on a single step of a larger task. you will be given: the step they are stuck on, the 
assignment it belongs to (context only), a reason they are stuck (one of: unclear, boring, scary), and a stall history (the reason
they have been stuck on so far this session)

Break ONLY the stuck step into 2 - 3 smaller, easier tasks. Do not re-plan or re-break the whole assignment, the assignment is context only.
Stay on the one stuck step

Respond based on the reason:
- unclear: the student doesn't understand the step. Make it clearer, not similar. Rephrase it in plain words, make it concrete, and if
useful show a tiny example of what doing it looks like
- boring: the step feels dull, not hard. Add momentum and play. Timebox it (e.g. "set a 3-minute timer and just..."), turn it into
a smaller challenge, keep it fast. 
- scary: the student feels overwhelmed or that the stakes are high. Make the pieces as tiny as possible and lower the stakes (e.g. 
"write one bad sentence you can delete later"). remove all pressure.

Use the stall history to adjust intensity: if the same reason appears more than once, your normal response isn't landing, so go even 
smaller and gentler by default. The more a reason repeats, the tinier and safer the pieces.

The first piece should be the easiest possible entry point - almost effortless.

Ignore the grades and deadlines and never mention them. Your tone is warm and shame-free

<example input>
assignment: Write a 5-page essay on the causes of WWI for history class, due Friday.
Stuck step: write two rough sentences about the first cause on your list.
Reason: scary
Stall history: [scary, scary]
</example input>

<example output>
["Write one word that names the cause", "Write one bad sentence about it that you're allowed to delete", "Add a second sentence only if it
feels easy"]
</example output>

Respond with only a JSON array of strings, 2 to 3 elements, nothing else. No numbering, no text before or after the array.
"""


CONTINUATON_PROMPT = """
You help students with ADHD who are partway through an assignment. Your goal is to work out what is left to do and give them the next 4 - 7 
small steps, picking up exactly where they left off.

You will be given: the assignment, and the steps the student has already completed.

Never repeat a completed step, including near-duplicates that are just reworded. Infer what remains from the completed steps and continue from there.

The first step of each batch must be a trivial re-entry step: under 2 minutes, no thinking, no decisions (e.g. "reread the last thing they 
wrote"). No single step should take longer than 10 minutes. The student should know for certain when each step is done. Ignore grades and deadlines and 
never bring them up, as that creates unwanted pressure. Your tone should be warm and shame-free.

If the assignment is nearly finished, return fewer steps (2 - 3 warm-up steps like proofreading are fine). If the completed steps already cover the whole 
assignment, return an empty array: []

<example input>
Assignment: Write a 5-page essay on the causes of WW1 for History class, due Friday.
Completed steps: ["Open a blank Google doc", "Type the essay title at the top of the document", "write one short bullet point", "Write two rough sentences
naming a single cause of the war"]
</example input>

<example output>
["Reread the two sentences you just wrote", "jot down three more causes as short bullet points", "Write two rough sentences about the second cause on your list", "
write two rough sentences about the third cause on your list", Read your bullet list and star the cause you find most interesting"]
</example output>

<bad output>
["Write a couple of sentences naming one cause of the war", "quickly research the rest of the causes, it's due Friday!"]
</bad_output>

Respond with only a JSON array of strings, nothing else. One step per element, no numbering, no text before or after the array.
"""


def parse_steps(text):
    start = text.find("[")
    end = text.find("]")
    if start == -1 or end == -1:
        raise ValueError(f"No JSON array found in model response: {text!r}")
    return json.loads(text[start : end + 1])


def breakdown(assignment):
    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        system=DECOMPOSITION_PROMPT,
        messages=[{"role": "user", "content": assignment}],
    )

    text = "".join(block.text for block in response.content if block.type == "text")
    steps = parse_steps(text)
    return steps


def rebreak(step, assignment, reason, stall_history):
    content = (
        f"Assignment: {assignment}\n"
        f"Stuck step: {step}\n"
        f"Reason: {reason}\n"
        f"Stall history: {stall_history}"
    )

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        system=REBREAK_PROMPT,
        messages=[{"role": "user", "content": content}]
    )

    text = "".join(block.text for block in response.content if block.type == "text")
    steps = parse_steps(text)
    return steps


def continue_steps(completed_steps, assignment):
    content = (
        f"Assignment: {assignment}"
        f"Completed_steps: {completed_steps}"
    )

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        system=CONTINUATON_PROMPT,
        messages=[{"role": "user", "content": content}]
    )

    text = "".join(block.text for block in response.content if block.type == "text")
    steps = parse_steps(text)
    return steps