console.log("app.js is running");

const button = document.getElementById("execute");
button.disabled = true; // Set button to disabled by default to prevent an empty entry

const stepsBox = document.getElementById("steps");
const progressFill = document.getElementById("progressFill");
const streakDisplay = document.getElementById("streak");
const statusBar = document.getElementById("statusBar");
const continueButton = document.getElementById("continue");
const inputText = document.getElementById("inputText");
const continueStepsBox = document.getElementById("continueSteps");
const finishText = document.getElementById("finished");

let totalSteps = 0;
let progress = 0;
let streak = 0;
let assignment = "";
let completedSteps = [];

function updateProgress() {
   progressFill.style.width = (progress / totalSteps) * 100 + "%";
}

function checkComplete() {
   if (totalSteps > 0 && progress >= totalSteps - 0.001) {
       continueButton.classList.remove("hidden");
       continueButton.classList.add("fade-in");
   }
}

function renderSteps(steps) {
   for (const [index, step] of steps.entries()) {
       const card = document.createElement("div");
       card.classList.add("step");

       const stepText = document.createElement("span");
       stepText.className = "step-text";
       stepText.textContent = step;
       card.appendChild(stepText);

       if (index === 0) {
           const badge = document.createElement("span");
           badge.textContent = " 2-minute starter";
           badge.className = "badge"; // Use for CSS styling later on
           stepText.appendChild(badge);
       }

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

           for (const reason of ["unclear", "boring", "scary"]) {
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

inputText.addEventListener("input", function () {
   button.disabled = inputText.value.trim() === "";
});

button.addEventListener("click", async function () {
   assignment = inputText.value;
   console.log(assignment);

   button.disabled = true;
   stepsBox.innerHTML = '<div class="spinner"></div><p class="loading">Thinking...</p>';

   const response = await fetch("/breakdown", {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({assignment: assignment})
   })
   const data = await response.json();
   button.disabled = false;

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

   const response = await fetch("/continue", {
       method: "POST",
       headers: {"Content-Type": "application/json"},
       body: JSON.stringify({assignment: assignment, steps: completedSteps})
   })
   const data = await response.json();

   continueStepsBox.innerHTML = "";

   if (data.steps.length === 0) {
       continueButton.classList.add("hidden");
       continueButton.disabled = true;
       continueStepsBox.innerHTML = '<p class="loading">🎉 All done — you\'ve finished everything!</p>';
       return;
   }

   continueButton.classList.add("hidden");
   totalSteps += data.steps.length;
   updateProgress();
   renderSteps(data.steps);
   continueButton.disabled = false;
});