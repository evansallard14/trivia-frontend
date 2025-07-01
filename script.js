// == Firebase Setup ==
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCsk8BddBwZFcOfnGISTk-gbGft9C44IY4",
  authDomain: "trivialeaderboard.firebaseapp.com",
  projectId: "trivialeaderboard",
  storageBucket: "trivialeaderboard.appspot.com",
  messagingSenderId: "928034737197",
  appId: "1:928034737197:web:596fb6dabb7759a262bca4",
  databaseURL: "https://trivialeaderboard-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// == Signup Section ==
const signupBtn = document.getElementById("signupBtn");
const usernameInput = document.getElementById("usernameInput");
const signupMessage = document.getElementById("signupMessage");
const gameSection = document.getElementById("gameSection");
const welcomeUser = document.getElementById("welcomeUser");

let score = 0;
let answeredQuestions = 0;
let username = "";

signupBtn.addEventListener("click", () => {
  username = usernameInput.value.trim();
  if (!username) {
    signupMessage.textContent = "Please enter a username.";
    signupMessage.style.color = "red";
    return;
  }

  // Set Firebase session
  welcomeUser.textContent = `Welcome, ${username}! Let's play.`;
  document.getElementById("signupSection").style.display = "none";
  gameSection.style.display = "block";
});

// == Game Logic ==
document.getElementById("startBtn").addEventListener("click", fetchTrivia);

let totalQuestions = 10;
let questionsAnswered = new Array(totalQuestions).fill(false);

async function fetchTrivia() {
  if (!username) {
    alert("Please sign up with a username first.");
    return;
  }

  try {
    const response = await fetch(`https://trivia-backend-5s52.onrender.com/daily-questions/${username}`);
    const data = await response.json();

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

// == Submit Score ==
document.getElementById("submitBtn").addEventListener("click", async () => {
  if (score === 100) score += 50;

  try {
    const response = await fetch("https://trivia-backend-5s52.onrender.com/submit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score })
    });

    const data = await response.json();
    if (response.ok) {
      showCustomPopup(data.message || `You earned ${score} points.`);
      document.getElementById("submitSection").style.display = "none";
      saveScoreToFirebase();
    } else {
      showCustomPopup(data.error || "Score not submitted.");
    }
  } catch (err) {
    console.error(err);
    showCustomPopup("Error submitting score.");
  }
});

function saveScoreToFirebase() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const week = `${now.getFullYear()}-W${getWeekNumber(now)}`;
  const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const year = `${now.getFullYear()}`;

  const periods = { daily: day, weekly: week, monthly: month, yearly: year };

  for (const [period, label] of Object.entries(periods)) {
    set(ref(db, `leaderboard/${period}/${label}/${username}`), {
      username,
      score
    });
  }
}

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
  const labels = {
    daily: now.toISOString().slice(0, 10),
    weekly: `${now.getFullYear()}-W${getWeekNumber(now)}`,
    monthly: `${now.getFullYear()}-${now.getMonth() + 1}`,
    yearly: `${now.getFullYear()}`
  };

  const label = labels[period];
  const dbRef = ref(db, `leaderboard/${period}/${label}`);

  onValue(dbRef, (snapshot) => {
    const scores = snapshot.val();
    if (!scores) {
      leaderboardContent.innerHTML = "<p>No scores yet.</p>";
      return;
    }

    const entries = Object.values(scores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    leaderboardContent.innerHTML = `
      <table style="width:100%; margin-top: 20px;">
        <tr><th>Rank</th><th>Username</th><th>Score</th></tr>
        ${entries.map((entry, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${entry.username}</td>
            <td>${entry.score}</td>
          </tr>
        `).join("")}
      </table>
    `;
  });
}

// == Popup ==
function showCustomPopup(message) {
  let popup = document.createElement("div");
  popup.className = "popup";
  popup.textContent = message;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 4000);
}
