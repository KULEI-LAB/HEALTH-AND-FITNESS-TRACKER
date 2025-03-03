document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners()
    loadGoals()
  })
  
  function setupEventListeners() {
    // Add goal button
    const addGoalBtn = document.querySelector(".add-goal-btn")
    const modal = document.getElementById("addGoalModal")
    const cancelBtn = modal.querySelector(".cancel-btn")
    const goalForm = document.getElementById("goalForm")
  
    addGoalBtn.addEventListener("click", () => {
      modal.classList.add("active")
      goalForm.reset()
      delete goalForm.dataset.goalId // Clear any existing goal ID
    })
  
    cancelBtn.addEventListener("click", () => {
      modal.classList.remove("active")
      goalForm.reset()
    })
  
    // Category filters
    const categoryBtns = document.querySelectorAll(".category-btn")
    categoryBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        categoryBtns.forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        loadGoals(btn.dataset.period)
      })
    })
  
    // Goal form submission
    goalForm.addEventListener("submit", (e) => {
      e.preventDefault()
      const goalId = goalForm.dataset.goalId
      if (goalId) {
        updateGoal(goalId)
      } else {
        addNewGoal()
      }
    })
  
    // Edit and delete buttons
    document.querySelector(".goals-grid").addEventListener("click", (e) => {
      if (e.target.classList.contains("edit-btn")) {
        const goalCard = e.target.closest(".goal-card")
        editGoal(goalCard)
      } else if (e.target.classList.contains("delete-btn")) {
        const goalCard = e.target.closest(".goal-card")
        deleteGoal(goalCard)
      }
    })
  
    // Add this to the setupEventListeners function
    const goalTypeSelect = document.getElementById("goalType")
    const goalTargetUnitSpan = document.getElementById("goalTargetUnit")
  
    goalTypeSelect.addEventListener("change", (e) => {
      const selectedType = e.target.value
      goalTargetUnitSpan.textContent = getGoalUnit(selectedType)
    })
  }
  
  async function loadGoals(period = "daily") {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        window.location.href = "/login.html"
        return
      }
  
      const response = await fetch(`http://localhost:3000/api/goals?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to fetch goals")
      }
  
      const { goals } = await response.json()
      renderGoals(goals)
    } catch (error) {
      console.error("Error loading goals:", error)
      // Show error message to user
    }
  }
  
  async function addNewGoal() {
    const form = document.getElementById("goalForm")
    const goalType = form.goalType.value
    const goalData = {
      type: goalType,
      target: Number.parseFloat(form.goalTarget.value),
      period: form.goalPeriod.value,
      created_at: new Date().toISOString(),
      unit: getGoalUnit(goalType), // Add this line
    }
  
    try {
      const response = await fetch("http://localhost:3000/api/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(goalData),
      })
  
      if (!response.ok) {
        throw new Error("Failed to create goal")
      }
  
      document.getElementById("addGoalModal").classList.remove("active")
      form.reset()
      loadGoals(goalData.period)
    } catch (error) {
      console.error("Error creating goal:", error)
      // Show error message to user
    }
  }
  
  async function updateGoal(goalId) {
    const form = document.getElementById("goalForm")
    const goalType = form.goalType.value
    const goalData = {
      target: Number.parseFloat(form.goalTarget.value),
      period: form.goalPeriod.value,
      created_at: new Date().toISOString(),
      unit: getGoalUnit(goalType), // Add this line
    }
  
    try {
      const response = await fetch(`http://localhost:3000/api/goals/${goalId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(goalData),
      })
  
      if (!response.ok) {
        throw new Error("Failed to update goal")
      }
  
      document.getElementById("addGoalModal").classList.remove("active")
      form.reset()
      loadGoals(goalData.period)
    } catch (error) {
      console.error("Error updating goal:", error)
      // Show error message to user
    }
  }
  
  async function deleteGoal(goalCard) {
    if (!confirm("Are you sure you want to delete this goal?")) {
      return
    }
  
    const goalId = goalCard.dataset.goalId
    try {
      const response = await fetch(`http://localhost:3000/api/goals/${goalId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to delete goal")
      }
  
      const activePeriod = document.querySelector(".category-btn.active").dataset.period
      loadGoals(activePeriod)
    } catch (error) {
      console.error("Error deleting goal:", error)
      // Show error message to user
    }
  }
  
  function getGoalUnit(type) {
    const units = {
      weight: "kg",
      calories: "kcal",
      exercise: "mins",
      water: "ml",
    }
    return units[type] || ""
  }
  
  async function fetchCurrentValue(goal) {
    const token = localStorage.getItem("token");
    const today = new Date().toISOString().split("T")[0];
    let endpoint = "";
  
    switch (goal.type) {
      case "water":
        endpoint = `http://localhost:3000/api/water/stats?date=${today}`;
        break;
      case "calories":
        endpoint = `http://localhost:3000/api/food/nutrition-totals?date=${today}`;
        break;
      case "exercise":
        endpoint = `http://localhost:3000/api/activities?date=${today}`;
        break;
      default:
        return 0;
    }
  
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch current value");
      }
  
      const data = await response.json();
      
      if (goal.type === "exercise") {
        // Sum up the duration of all activities for today
        return data.activities.reduce((total, activity) => total + activity.duration, 0);
      } else if (goal.type === "calories") {
        return data.calories.current || 0;
      } else {
        return data.current || 0;
      }
    } catch (error) {
      console.error("Error fetching current value:", error);
      return 0;
    }
  }
  
  function calculateProgress(goal, currentValue) {
    return Math.round((currentValue / goal.target) * 100)
  }
  
  function calculateStrokeDashOffset(progress) {
    const circumference = 2 * Math.PI * 54
    return circumference - (progress / 100) * circumference
  }
  
  async function renderGoals(goals) {
    const goalsGrid = document.querySelector(".goals-grid");
    const currentDate = new Date().setHours(0, 0, 0, 0);
  
    const filteredGoals = goals.filter((goal) => {
      const goalDate = new Date(goal.created_at).setHours(0, 0, 0, 0);
      if (goal.period === "daily") {
        return goalDate === currentDate;
      } else if (goal.period === "weekly") {
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return goalDate >= weekStart;
      } else if (goal.period === "yearly") {
        const yearStart = new Date(currentDate.getFullYear(), 0, 1);
        return goalDate >= yearStart;
      }
      return true;
    });
  
    if (filteredGoals.length === 0) {
      goalsGrid.innerHTML = '<div class="no-goals">No active goals found. Click "Add New Goal" to create one.</div>';
      return;
    }
  
    const goalPromises = filteredGoals.map(async (goal) => {
      const currentValue = await fetchCurrentValue(goal);
      let progress = calculateProgress(goal, currentValue);
      const unit = getGoalUnit(goal.type);
      const isCompleted = currentValue >= goal.target;
  
      // If completed, set progress to 100%
      if (isCompleted) {
        progress = 100;
      }
  
      return `
        <div class="goal-card" data-goal-id="${goal.id}">
          <div class="goal-header">
            <div class="goal-icon">${getGoalIcon(goal.type)}</div>
            <h3>${capitalizeFirstLetter(goal.type)} Goal</h3>
            <div class="goal-actions">
              <button class="edit-btn">✏️</button>
              <button class="delete-btn">🗑️</button>
            </div>
          </div>
          <div class="goal-content">
            <div class="goal-progress">
              <div class="progress-ring">
                <svg>
                  <circle class="progress-ring-circle" cx="60" cy="60" r="54" 
                         style="stroke-dasharray: 339.292; stroke-dashoffset: ${calculateStrokeDashOffset(progress)}"/>
                </svg>
                <span class="progress-text">${progress}%</span>
              </div>
            </div>
            <div class="goal-details">
              <p class="goal-target">Target: ${goal.target} ${unit}</p>
              <p class="goal-current">Current: ${currentValue} ${unit}</p>
              <p class="goal-remaining">${isCompleted ? 'Completed!' : `${goal.target - currentValue} ${unit} to go`}</p>
            </div>
          </div>
        </div>
      `;
    });
  
    const goalCards = await Promise.all(goalPromises);
    goalsGrid.innerHTML = goalCards.join("");
  }
  
  function calculateProgress(goal, currentValue) {
    return Math.min(Math.round((currentValue / goal.target) * 100), 100);
  }
  
  function getGoalIcon(type) {
    const icons = {
      weight: "⚖️",
      calories: "🔥",
      exercise: "🏃‍♂️",
      water: "💧",
    }
    return icons[type] || "🎯"
  }
  
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  
  function editGoal(goalCard) {
    const goalId = goalCard.dataset.goalId
    const goalType = goalCard.querySelector("h3").textContent.split(" ")[0].toLowerCase()
    const goalTargetText = goalCard.querySelector(".goal-target").textContent.split(":")[1].trim()
    const [goalTarget, goalUnit] = goalTargetText.split(" ")
    const goalPeriod = document.querySelector(".category-btn.active").dataset.period
  
    const form = document.getElementById("goalForm")
    form.goalType.value = goalType
    form.goalTarget.value = goalTarget
    form.goalPeriod.value = goalPeriod
    form.dataset.goalId = goalId
  
    // Add this line to display the unit
    document.getElementById("goalTargetUnit").textContent = goalUnit
  
    document.getElementById("addGoalModal").classList.add("active")
  }
  
  