console.log("app.js is running");

const button = document.getElementById("execute");
const stepsBox = document.getElementById("steps");

const progressFill = document.getElementById("progressFill");
const streakDisplay = document.getElementById("streak");

let totalSteps = 0;
let progress = 0;
let streak = 0;

function updateProgress() {
    progressFill.style.width = (progress / totalSteps) * 100 + "%";
}

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
    totalSteps = data.steps.length;
    progress = 0;
    streak = 0;
    updateProgress();
    streakDisplay.textContent = "Streak: 0";

    for (const [index, step] of data.steps.entries()) {
        const card = document.createElement("div");
        card.classList.add("step");
        card.textContent = step;

        if (index === 0) {
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
            doneButton.disabled = true;
            progress += 1;
            updateProgress();
            streak += 1;
            streakDisplay.textContent = "Streak: " + streak;
            stuckButton.style.display = "none";
            card.classList.add("completed");
        });

        stuckButton.addEventListener("click", function() {
            stuckButton.style.display = "none";

            streak = 0;
            streakDisplay.textContent = "Streak: 0";

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
                    card.className = "step-group";

                    const heading = document.createElement("p");
                    heading.textContent = step;
                    card.appendChild(heading);

                    for (const smallStep of data.steps) {
                        const subCard = document.createElement("div");
                        subCard.classList.add("step");
                        subCard.textContent = smallStep;

                        const subDoneButton = document.createElement("button");
                        subDoneButton.textContent = "Done";

                        subDoneButton.addEventListener("click", function() {
                            subCard.style.textDecoration = "line-through";
                            subDoneButton.disabled = true;
                            progress += 1 / data.steps.length;
                            updateProgress();
                            streak += 1;
                            streakDisplay.textContent = "Streak: " + streak;
                            subCard.classList.add("completed");
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