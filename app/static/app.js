console.log("app.js is running");

const button = document.getElementById("execute");
const stepsBox = document.getElementById("steps");

button.addEventListener("click", async function () {
    const assignment = inputText.value;
    console.log(assignment);
    const response = await fetch("/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignment: assignment })
    })
    const data = await response.json();

    stepsBox.textContent = "";
    for (const step of data.steps) {
        const card = document.createElement("div");
        card.textContent = step;

        const doneButton = document.createElement("button");
        doneButton.textContent = "Done";
        card.appendChild(doneButton);

        doneButton.addEventListener("click", function () {
            card.style.textDecoration = "line-through";
        })

        stepsBox.appendChild(card);
    }
});