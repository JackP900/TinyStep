console.log("app.js is running"); // Ensures that the program is running on the webpage

const button = document.getElementById("execute");
const continueButton = document.getElementById("continue");
const clearButton = document.getElementById("clear");

const stepsBox = document.getElementById("steps");
const continueStepsBox = document.getElementById("continueSteps");

const inputText = document.getElementById("inputText");

const progressFill = document.getElementById("progressFill");
const streakDisplay = document.getElementById("streak");
let streak = 0;
const statusBar = document.getElementById("statusBar");
const insightsBox = document.getElementById("insights");

// Database variables
let taskId = null; // DB row ID
let steps = [];

let assignment = "";
button.disabled = true; // Set button to disabled by default to prevent an empty entry

// Used to change the progress bar to represent how close the user is to completion
function refreshProgress() {
   let total = 0;
   let done = 0;

   steps.forEach(function (step) {
       total += 1;
       if (step.subs) {
           const finished = step.subs.filter(function (s) {
               return s.done;
           }).length;
           done += finished / step.subs.length;
       } else if (step.done) {
           done += 1;
       }
    });

   progressFill.style.width = (total ? (done / total) * 100 : 0) + "%";
   streakDisplay.textContent = "Streak: " + streak;

   if (total > 0 && done >= total - 0.001) {
       continueButton.classList.remove("hidden");
   } else {
       continueButton.classList.add("hidden");
   }
}

// Saves the current state of the steps so the user can return to the webpage later
async function saveState(finished = false) {
    if (steps.length === 0) return; // No need to save as nothing is there yet
    const response = await fetch("/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            task_id: taskId,
            assignment: assignment,
            finished: finished,
            state: { steps: steps, streak: streak }
        })
    });
    const data = await response.json();
    if (data.task_id) taskId = data.task_id;
}

// Main functions to render out each step on the webpage
function render() {
   stepsBox.innerHTML = "";
   steps.forEach(function (step) {
      stepsBox.appendChild(step.subs ? createGroup(step) : createStep(step));
   });
}

function createStep(step) {
    const card = document.createElement("div");
    card.className = "step";

    const stepText = document.createElement("span");
    stepText.className = "step-text";
    stepText.textContent = step.text;
    card.appendChild(stepText);

    if (step.badge) { // Checking if the step has the 2-minute starter badge
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "2-minute starter";
        stepText.appendChild(badge);
    }

    const actions = document.createElement("div");
    actions.className = "actions";
    card.appendChild(actions);

    const doneButton = document.createElement("button");
    doneButton.className = "done";
    doneButton.textContent = "Done";
    doneButton.addEventListener("click", function () {
        step.done = true;   // For database
        streak += 1;

        stepText.style.textDecoration = "line-through";
        doneButton.disabled = true;
        stuckButton.disabled = true;
        card.classList.add("completed", "pop");

        refreshProgress();
        saveState();        // Saving to database
    });
    actions.appendChild(doneButton);

    const stuckButton = document.createElement("button");
    stuckButton.textContent = "I'm stuck";
    stuckButton.addEventListener("click", function () {
        renderStuck(step, card);
    });
    actions.appendChild(stuckButton);

    if (step.done) {
        stepText.style.textDecoration = "line-through";
        doneButton.disabled = true;
        stuckButton.disabled = true;
        card.classList.add("completed");
        return card;
    }
    return card;
}

function createGroup(step) {
    const stepGroup = document.createElement("div");
    stepGroup.className = "step-group";

    const heading = document.createElement("p");
    heading.textContent = step.text;
    stepGroup.appendChild(heading);

    step.subs.forEach(function (sub) {
        const card = document.createElement("div");
        card.className = "step";

        const stepText = document.createElement("span");
        stepText.className = "step-text";
        stepText.textContent = sub.text;
        card.appendChild(stepText);

        const actions = document.createElement("div");
        actions.className = "actions";
        card.appendChild(actions);

        const doneButton = document.createElement("button");
        doneButton.className = "done";
        doneButton.textContent = "Done";
        actions.appendChild(doneButton);

        if (sub.done) {
            stepText.style.textDecoration = "line-through";
            doneButton.disabled = true;
            card.classList.add("completed");
        } else {
            doneButton.addEventListener("click", function() {
                sub.done = true;   // For database
                streak += 1;

                stepText.style.textDecoration = "line-through";
                doneButton.disabled = true;
                card.classList.add("completed", "pop");

                refreshProgress();
                saveState();        // Saving to database
            });
        }
        stepGroup.appendChild(card);
    })
    return stepGroup;
}

function renderStuck(step, card) {
    streak = 0;
    refreshProgress();
    card.querySelector(".actions").remove();

    const question = document.createElement("p");
    question.textContent = "Is this step unclear, boring, scary, or pointless?";
    card.appendChild(question);

    const choices = document.createElement("div");
    choices.className = "actions";
    card.appendChild(choices);

    for (const reason of ["unclear", "boring", "scary", "pointless"]) {
        const choiceButton = document.createElement("button");
        choiceButton.textContent = reason;
        choiceButton.addEventListener("click", async function () {
            const stallHistory = JSON.parse(localStorage.getItem("stallHistory") || "[]");
            stallHistory.push(reason);
            localStorage.setItem("stallHistory", JSON.stringify(stallHistory));

            card.innerHTML = '<div class="spinner"></div>'

            const response = await fetch("/stuck", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ step: step.text, assignment: assignment, reason: reason, stall_history: stallHistory, task_id:taskId })
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                showError(card, response.status, error.error, () => choiceButton.click());
                return;
            }
            const data = await response.json();

            step.subs = data.steps.map(function (t) {
                return {
                    text: t,
                    done: false
                };
            });
            card.replaceWith(createGroup(step));
            refreshProgress();
            saveState();
        });
        choices.appendChild(choiceButton);
    }
}
//

// Clear steps function
async function clearAll() {
    if (!confirm("Clear all steps and start fresh?")) {
        return;
    }

    if (taskId) await saveState(true);

    // Sets database row to nothing
    steps = [];
    streak = 0;
    taskId = null;

    // Resetting all webpage elements
    stepsBox.innerHTML = "";
    continueStepsBox.innerHTML = "";
    statusBar.classList.add("hidden");
    continueButton.classList.add("hidden");

    inputText.value = "";
    button.disabled = true;
    inputText.focus();
}

// Error handling function
function showError(container, code, message, retryFn) {
    container.innerHTML = `
        <div class="error-box fade-in">
            <svg width="52" height="52" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 L22 20 H2 Z" fill="#e53935" stroke="#e53935" stroke-width="2.5" stroke-linejoin="round"/>
                <rect x="11" y="9" width="2" height="6" rx="1" fill="#fff"/>
                <rect x="11" y="16.5" width="2" height="2" rx="1" fill="#fff"/>
            </svg>
            <div class="error-code"></div>
            <div class="error-message"></div>
            <button class="retry">Try again</button>
        </div>`;
    container.querySelector(".error-code").textContent = code ? "Error " + code : "Something went wrong";
    container.querySelector(".error-message").textContent = message || "Please try again in a moment.";
    container.querySelector(".retry").addEventListener("click", retryFn);
}

// Prevents the user from submitting an empty text box
inputText.addEventListener("input", function () {
   button.disabled = inputText.value.trim() === "";
});

// "Break it down" button function
button.addEventListener("click", async function () {
   assignment = inputText.value;

   button.disabled = true;
   stepsBox.innerHTML = '<div class="spinner"></div><p class="loading">Thinking...</p>';

   // Implemented to always throw an error when "!DEMOERROR" is typed into the box
   if (assignment.trim() === "!DEMOERROR") {
       showError(stepsBox, 502, "This is a test error.", () => button.click());
       return;
   }

   // Fetching AI response from the user input
   const response = await fetch("/breakdown", {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({assignment: assignment})
   })

   if (!response.ok) {
       const error = await response.json().catch(() => ({}));
       showError(stepsBox, response.status, error.error, () => button.click());
       button.disabled = false;
       return;
   }
   const data = await response.json();
   button.disabled = false;

   // For database
   taskId = null;
   streak = 0;
   steps = data.steps.map(function (text, i) {
       return{
           text: text,
           badge: i === 0,
           done: false,
           subs: null
       };
   });

   // Setting up the area and variables for the steps to be displayed
   stepsBox.textContent = "";
   streak = 0;
   refreshProgress();
   streakDisplay.textContent = "Streak: 0";

   // Animate in the progress bar and streak when the prompt has been generated.
   statusBar.classList.remove("hidden");
   statusBar.classList.add("fade-in");

   await saveState();
   render();
});

// Clear all button listener
clearButton.addEventListener("click", clearAll);

// "Continue" button function
continueButton.addEventListener("click", async function () {
   continueButton.disabled = true;
   continueStepsBox.innerHTML = '<div class="spinner"></div><p class="loading">Thinking...</p>';

   // Lets the AI know what steps have been completed
   const completedSteps = [];
   steps.forEach(function (step) {
       if (step.subs) {
           step.subs.forEach(function (s) {
               if (s.done) {
                   completedSteps.push(s.text);
               }
           });
       } else if (step.done) {
           completedSteps.push(step.text)
           }
   })

   // Fetching AI response using the previous user input and steps
   const response = await fetch("/continue", {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({assignment: assignment, steps: completedSteps})
   })
   if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    showError(continueStepsBox, response.status, error.error, () => continueButton.click());
    continueButton.disabled = false;
    return;
   }
   const data = await response.json();

   // Clearing the new area for the next steps
   continueStepsBox.innerHTML = "";

   // Checking if the returned array was empty, meaning that the user has completed all steps
   if (data.steps.length === 0) {
       continueButton.classList.add("hidden");
       continueButton.disabled = true;
       continueStepsBox.innerHTML = '<p class="loading">🎉 All done — you\'ve finished everything!</p>';
       saveState(true);
       return;
   }

    // For database
    data.steps.forEach(function (text) {
        const step = {
            text: text,
            badge: false,
            done: false,
            subs: null
        };
        steps.push(step);
        stepsBox.appendChild(createStep(step));
    })

   // Showing the new steps and updating all variables/progress
   continueButton.classList.add("hidden");
   refreshProgress();
   saveState();
   continueButton.disabled = false;
});

// Reloads saved steps so a user can continue a previous session
window.addEventListener("DOMContentLoaded", async function () {
    const response = await fetch ("/load");
    if (!response.ok) return;
    const { task } = await response.json();
    if (!task) return;

    taskId = task.task_id;
    assignment = task.assignment;
    steps = task.state.steps;
    streak = task.state.streak || 0;

    inputText.value = assignment;
    button.disabled = false;
    statusBar.classList.remove("hidden");
    render();
    refreshProgress();
})

window.addEventListener("DOMContentLoaded", async function () {
    const response = await fetch("/insights");
    if (!response.ok) return;

    const data = await response.json();
    if (data.insights.length === 0) return;

    const parts = data.insgihts.map(item => item.reason + " (" + item.count + ")");
    insightsBox.textContent = "You get stuck most when steps feel: " + parts.join(", ");
    insightsBox.classList.remove("hidden");
})