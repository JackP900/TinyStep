console.log("app.js is running"); // Ensures that the program is running on the webpage

const button = document.getElementById("execute");
const stepsBox = document.getElementById("steps");
const continueButton = document.getElementById("continue");
const inputText = document.getElementById("inputText");
const continueStepsBox = document.getElementById("continueSteps");

const progressFill = document.getElementById("progressFill");
const streakDisplay = document.getElementById("streak");
const statusBar = document.getElementById("statusBar");

let totalSteps = 0;
let progress = 0;
let streak = 0;
let assignment = "";
let completedSteps = [];
button.disabled = true; // Set button to disabled by default to prevent an empty entry

// Used to change the progress bar to represent how close the user is to completion
function updateProgress() {
   progressFill.style.width = (progress / totalSteps) * 100 + "%";
}

// Checks if all steps have been crossed out, used to enable the continue button
function checkComplete() {
   if (totalSteps > 0 && progress >= totalSteps - 0.001) {
       continueButton.classList.remove("hidden");
       continueButton.classList.add("fade-in");
   }
}

// Main function to render out each step on the webpage
function renderSteps(steps) {
   for (const [index, step] of steps.entries()) {
       const card = document.createElement("div"); // Main "block" where the steps will reside
       card.classList.add("step");

       const stepText = document.createElement("span");
       stepText.className = "step-text";
       stepText.textContent = step;
       card.appendChild(stepText);

       // Used to determine whether the step requires the "2-minute starter" badge or not
       if (index === 0) {
           const badge = document.createElement("span");
           badge.textContent = " 2-minute starter";
           badge.className = "badge";
           stepText.appendChild(badge);
       }

       // Container for the action buttons
       const actions = document.createElement("div");
       actions.className = "actions";
       card.appendChild(actions);

       const doneButton = document.createElement("button");
       doneButton.textContent = "Done";
       actions.appendChild(doneButton);

       const stuckButton = document.createElement("button");
       stuckButton.textContent = "I'm stuck";
       actions.appendChild(stuckButton);

       doneButton.addEventListener("click", function () {
           card.style.textDecoration = "line-through";
           doneButton.disabled = true;
           progress += 1;
           updateProgress();
           streak += 1;
           streakDisplay.textContent = "Streak: " + streak;
           stuckButton.style.display = "none";
           card.classList.add("completed");
           completedSteps.push(step);
           checkComplete();
       });

       stuckButton.addEventListener("click", function () {
           stuckButton.style.display = "none";

           streak = 0;
           streakDisplay.textContent = "Streak: 0";

           const question = document.createElement("p");
           question.textContent = "Is this step unclear, boring, or scary?";
           card.appendChild(question);

           const choices = document.createElement("div");
           choices.className = "actions";
           card.appendChild(choices);

           for (const reason of ["unclear", "boring", "scary", "pointless"]) {
               const choiceButton = document.createElement("button");
               choiceButton.textContent = reason;
               choices.appendChild(choiceButton);

               choiceButton.addEventListener("click", async function () {
                   const stored = localStorage.getItem("stallHistory");
                   const stallHistory = stored ? JSON.parse(stored) : [];
                   stallHistory.push(reason);
                   localStorage.setItem("stallHistory", JSON.stringify(stallHistory));

                   card.innerHTML = '<div class="spinner"></div>';

                   const response = await fetch("/stuck", {
                       method: "POST",
                       headers: {"Content-Type": "application/json"},
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

                       const subText = document.createElement("span");
                       subText.className = "step-text";
                       subText.textContent = smallStep;
                       subCard.appendChild(subText);

                       const subActions = document.createElement("div");
                       subActions.className = "actions";
                       subCard.appendChild(subActions);

                       const subDoneButton = document.createElement("button");
                       subDoneButton.textContent = "Done";
                       subActions.appendChild(subDoneButton);

                       subDoneButton.addEventListener("click", function () {
                           subCard.style.textDecoration = "line-through";
                           subDoneButton.disabled = true;
                           progress += 1 / data.steps.length;
                           updateProgress();
                           checkComplete();
                           streak += 1;
                           streakDisplay.textContent = "Streak: " + streak;
                           completedSteps.push(smallStep);
                           subCard.classList.add("completed");
                       });

                       card.appendChild(subCard);
                   }
               })
           }
       });
       stepsBox.appendChild(card);
   }
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

button.addEventListener("click", async function () {
   assignment = inputText.value;
   console.log(assignment);

   button.disabled = true;
   stepsBox.innerHTML = '<div class="spinner"></div><p class="loading">Thinking...</p>';

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

   // Setting up the area and variables for the steps to be displayed
   stepsBox.textContent = "";
   totalSteps = data.steps.length;
   progress = 0;
   completedSteps = [];
   streak = 0;
   updateProgress();
   streakDisplay.textContent = "Streak: 0";

   // Animate in the progress bar and streak when the prompt has been generated.
   statusBar.classList.remove("hidden");
   statusBar.classList.add("fade-in");

   renderSteps(data.steps);
});

continueButton.addEventListener("click", async function () {
   continueButton.disabled = true;
   continueStepsBox.innerHTML = '<div class="spinner"></div><p class="loading">Thinking...</p>';

   // Fetching AI response using the previous user input and steps
   const response = await fetch("/continue", {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({assignment: assignment, steps: completedSteps})
   })
   const data = await response.json();

   // Clearing the new area for the next steps
   continueStepsBox.innerHTML = "";

   // Checking if the returned array was empty, meaning that the user has completed all steps
   if (data.steps.length === 0) {
       continueButton.classList.add("hidden");
       continueButton.disabled = true;
       continueStepsBox.innerHTML = '<p class="loading">🎉 All done — you\'ve finished everything!</p>';
       return;
   }

   // Showing the new steps and updating all variables/progress
   continueButton.classList.add("hidden");
   totalSteps += data.steps.length;
   updateProgress();
   renderSteps(data.steps);
   continueButton.disabled = false;
});