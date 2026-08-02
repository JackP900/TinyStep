console.log("app.js is running");

const button = document.getElementById("execute");
const stepsBox = document.getElementById("steps");

button.addEventListener("click", async function () {
    const assignment = inputText.value;
    console.log(assignment);

    button.disabled = true;
    stepsBox.textContent = "Thinking...";

    const response = await fetch("/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment: assignment })
    })
    const data = await response.json();
    button.disabled = false;

    stepsBox.textContent = "";
    for (const [index, step] of data.steps.entries()) {
        const card = document.createElement("div");
        card.textContent = step;

        if (index == 0) {
            const badge = document.createElement("span");
            badge.textContent = " 2-minute starter";
            badge.className = "badge"; // Use for CSS styling later on
            card.appendChild(badge);
        }

        const doneButton = document.createElement("button");
        doneButton.textContent = "Done";
        card.appendChild(doneButton);

        const stuckButton = document.createElement("button");
        stuckButton.textContent = "I'm stuck";
        card.appendChild(stuckButton);

        doneButton.addEventListener("click", function () {
            card.style.textDecoration = "line-through";
        })

        stuckButton.addEventListener("click", function() {
            stuckButton.style.display = "none";

            const question = document.createElement("p");
            question.textContent = "Is this step unclear, boring, or scary?";
            card.appendChild(question);

            for (const reason of ["unclear", "boring", "scary"]) {
                const choiceButton = document.createElement("button");
                choiceButton.textContent = reason;
                card.appendChild(choiceButton);

                choiceButton.addEventListener("click", async function() {
                    const stored = localStorage.getItem("stallHistory");
                    const stallHistory = stored ? JSON.parse(stored): [];
                    stallHistory.push(reason);
                    localStorage.setItem("stallHistory", JSON.stringify(stallHistory));

                    card.innerHTML = "Thinking...";

                    const response = await fetch("/stuck", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            step: step,
                            assignment: assignment,
                            reason: reason,
                            stall_history: stallHistory
                        })
                    });
                    const data = await response.json();

                    card.innerHTML = "";

                    const heading = document.createElement("p");
                    heading.textContent = step;
                    card.appendChild(heading);

                    for (const smallStep of data.steps) {
                        const subCard = document.createElement("div");
                        subCard.textContent = smallStep;

                        const subDoneButton = document.createElement("button");
                        subDoneButton.textContent = "Done";

                        subDoneButton.addEventListener("click", function() {
                            subCard.style.textDecoration = "line-through";
                        });

                        subCard.appendChild(subDoneButton);
                        card.appendChild(subCard);
                    }
                })
            }
        })

        stepsBox.appendChild(card);
    }
});