from app.ai import rebreak

print("script started")

assignment = "Write a 5 page essay on the causes of WWI for History class, due friday."
steps = "write two rough sentences about the first cause on your list."

for reason in ["unclear", "boring", "scary"]:
    print(f"\n=== reason: {reason} ===")
    pieces = rebreak(steps, assignment, reason, [reason, reason])
    for i, p in enumerate(pieces, 1):
        print(f"{i}, {p}")