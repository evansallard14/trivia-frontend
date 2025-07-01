// == Signup Section ==
const signupBtn = document.getElementById("signupBtn");
const usernameInput = document.getElementById("usernameInput");
const signupMessage = document.getElementById("signupMessage");
const gameSection = document.getElementById("gameSection");
const welcomeUser = document.getElementById("welcomeUser");

let score = 0;
let answeredQuestions = 0;

signupBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim();

  if (!username) {
    signupMessage.textContent = "Please enter a username.";
    signupMessage.style.color = "red";
    return;
  }

  localStorage.setItem("username", username);
  signupMessage.textContent = `Welcome, ${username}!`;
  signupMessage.style.color = "green";

  showGameSection();
});

function showGameSection() {
  const storedUsername = localStorage.getItem("username");
  if (storedUsername) {
    document.getElementById("signupSection").style.display = "none";
    gameSection.style.display = "block";
    welcomeUser.textContent = `Welcome, ${storedUsername}! Let's play.`;
  }
}

showGameSection();

// == Game Logic ==
document.getElementById("startBtn").addEventListener("click", fetchTrivia);

let totalQuestions = 10;
let questionsAnswered = new Array(totalQuestions).fill(false);

async function fetchTrivia() {
  const username = localStorage.getItem("username");
  if (!username) {
    alert("Please sign up with a username first.");
    return;
  }

  try {
    const response = await fetch(`http://127.0.0.1:5000/daily-questions/${username}`);
    const data = await response.json();

    console.log("Trivia API response:", response.status, data);

    if (response.ok) {
      showQuestions(data.questions);
    } else {
      showCustomPopup(data.error || "Unable to fetch questions.");
    }
  } catch (err) {
    console.error("Failed to fetch trivia", err);
    showCustomPopup("Trivia unavailable today.");
  }
}


function showQuestions(questions) {
  const container = document.getElementById("quizContainer");
  container.innerHTML = "";
  score = 0;
  answeredQuestions = 0;
  totalQuestions = questions.length;
  questionsAnswered = new Array(totalQuestions).fill(false);

  questions.forEach((q, index) => {
    const questionBlock = document.createElement("div");
    questionBlock.classList.add("question-block");

    const questionTitle = document.createElement("h3");
    questionTitle.innerHTML = `Q${index + 1}: ${q.question}`;
    questionBlock.appendChild(questionTitle);

    const allAnswers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);

    allAnswers.forEach((ans) => {
      const btn = document.createElement("button");
      btn.innerHTML = ans;
      btn.classList.add("answer-btn");

      btn.addEventListener("click", () => {
        if (questionsAnswered[index]) return;
        questionsAnswered[index] = true;

        const allBtns = questionBlock.querySelectorAll("button");
        allBtns.forEach(b => b.disabled = true);

        if (ans === q.correct_answer) {
          btn.classList.add("correct");
          score += 10;
        } else {
          btn.classList.add("incorrect");
          score -= 5;
          allBtns.forEach(b => {
            if (b.innerHTML === q.correct_answer) {
              b.classList.add("correct");
            }
          });
        }

        answeredQuestions++;
        if (answeredQuestions >= 1) {
          document.getElementById("submitSection").style.display = "block";
        }
      });

      questionBlock.appendChild(btn);
    });

    container.appendChild(questionBlock);
    container.appendChild(document.createElement("hr"));
  });
}

// == Score Submission ==
document.getElementById("submitBtn").addEventListener("click", async () => {
  if (score === 100) score += 50;
  const username = localStorage.getItem("username") || "Guest";

  try {
    const response = await fetch("http://127.0.0.1:5000/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score })
    });
    const data = await response.json();

    if (response.ok) {
      showCustomPopup(data.message || `You earned ${score} points.`);
      document.getElementById("submitSection").style.display = "none";
    } else {
      showCustomPopup(data.error || "Score not submitted.");
    }
  } catch (err) {
    console.error(err);
    showCustomPopup("Error submitting score.");
  }

  // Update local leaderboard for demo/dev
  const now = new Date();
  const periods = {
    daily: now.toISOString().slice(0, 10),
    weekly: `${now.getFullYear()}-W${getWeekNumber(now)}`,
    monthly: `${now.getFullYear()}-${now.getMonth() + 1}`,
    yearly: `${now.getFullYear()}`
  };

  for (let period in periods) {
    const key = `leaderboard_${period}_${periods[period]}`;
    const board = JSON.parse(localStorage.getItem(key) || "[]");

    const existing = board.find(entry => entry.username === username);
    if (existing) {
      existing.score += score;
    } else {
      board.push({ username, score });
    }

    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(key, JSON.stringify(board.slice(0, 10)));
  }
});

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// == Leaderboard Modal ==
const modal = document.getElementById("leaderboardModal");
const openBtn = document.getElementById("openLeaderboard");
const closeBtn = document.getElementById("closeLeaderboard");
const leaderboardContent = document.getElementById("leaderboardContent");

openBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
  loadLeaderboard("daily");
});

closeBtn.addEventListener("click", () => {
  modal.classList.add("hidden");
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadLeaderboard(btn.dataset.period);
  });
});

function loadLeaderboard(period) {
  const now = new Date();
  const periods = {
    daily: now.toISOString().slice(0, 10),
    weekly: `${now.getFullYear()}-W${getWeekNumber(now)}`,
    monthly: `${now.getFullYear()}-${now.getMonth() + 1}`,
    yearly: `${now.getFullYear()}`
  };

  const key = `leaderboard_${period}_${periods[period]}`;
  const scores = JSON.parse(localStorage.getItem(key) || "[]");

  const aggregated = {};
  scores.forEach(entry => {
    if (!aggregated[entry.username]) aggregated[entry.username] = 0;
    aggregated[entry.username] += entry.score;
  });

  const ranked = Object.entries(aggregated)
    .map(([username, score]) => ({ username, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  leaderboardContent.innerHTML = `
    <table style="width:100%; margin-top: 20px;">
      <tr><th>Rank</th><th>Username</th><th>Score</th></tr>
      ${ranked.map((entry, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${entry.username}</td>
          <td>${entry.score}</td>
        </tr>
      `).join("")}
    </table>
  `;
}

// == Custom Styled Popup ==
function showCustomPopup(message) {
  let popup = document.createElement("div");
  popup.className = "popup";
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 4000);
}
