from app.ai import breakdown 

print("script started")

assignment = "Write a 5 page essay on the causes of WWI for History class, due friday."
steps = breakdown(assignment)

print("type: ", type(steps))
print("count: ", len(steps))

for i, s in enumerate(steps, 1):
    print(f"{i}. {s}")