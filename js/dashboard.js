// dashboard.js
document.addEventListener("DOMContentLoaded", async () => {
    // Check for authentication
    const token = localStorage.getItem("token")
    if (!token) {
      window.location.href = "login.html"
      return
    }
  
    // Set authorization header for all fetch requests
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  
    // Initialize charts
    await initializeWeeklyProgressChart(headers)
    await initializeNutritionChart(headers)
  
    // Initialize dashboard data
    await updateQuickStats(headers)
    await updateRecentActivities(headers)
    updateHeaderDate()
  
    // Set up logout functionality
    document.getElementById("logout-btn").addEventListener("click", () => {
      localStorage.removeItem("token")
      window.location.href = "login.html"
    })
  
    // Update dashboard data every 5 minutes
    setInterval(() => updateDashboard(headers), 300000)
  })
  
  async function fetchGoals(headers) {
    try {
      const response = await fetch("http://localhost:3000/api/goals", { headers })
      if (!response.ok) throw new Error("Failed to fetch goals")
      const data = await response.json()
      return data.goals
    } catch (error) {
      console.error("Error fetching goals:", error)
      return []
    }
  }
  
  async function fetchNutritionTotals(headers, date = new Date().toISOString().split("T")[0]) {
    try {
      const response = await fetch(` http://localhost:3000/api/food/nutrition-totals?date=${date}`, { headers })
      if (!response.ok) throw new Error("Failed to fetch nutrition totals")
      return await response.json()
    } catch (error) {
      console.error("Error fetching nutrition totals:", error)
      return null
    }
  }
  
  async function fetchWaterStats(headers, date = new Date().toISOString().split("T")[0]) {
    try {
      const response = await fetch(`http://localhost:3000/api/water/stats?date=${date}`, { headers })
      if (!response.ok) throw new Error("Failed to fetch water stats")
      return await response.json()
    } catch (error) {
      console.error("Error fetching water stats:", error)
      return null
    }
  }
  
  async function fetchActivities(headers, date = new Date().toISOString().split("T")[0]) {
    try {
      const response = await fetch(`http://localhost:3000/api/activities?date=${date}`, { headers })
      if (!response.ok) throw new Error("Failed to fetch activities")
      const data = await response.json()
      return data.activities
    } catch (error) {
      console.error("Error fetching activities:", error)
      return []
    }
  }
  
  async function initializeWeeklyProgressChart(headers) {
    const ctx = document.getElementById("weeklyProgressChart").getContext("2d")
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split("T")[0]
    }).reverse()
  
    // Fetch data for each date
    const datasets = await Promise.all(
      dates.map(async (date) => {
        const nutritionData = await fetchNutritionTotals(headers, date)
        const activities = await fetchActivities(headers, date)
        const caloriesBurned = activities.reduce((sum, activity) => sum + activity.calories_burned, 0)
  
        return {
          consumed: nutritionData?.calories?.current || 0,
          burned: caloriesBurned,
        }
      }),
    )
  
    new Chart(ctx, {
      type: "line",
      data: {
        labels: dates.map((date) => new Date(date).toLocaleDateString("en-US", { weekday: "short" })),
        datasets: [
          {
            label: "Calories Consumed",
            data: datasets.map((d) => d.consumed),
            borderColor: "#667eea",
            tension: 0.4,
            fill: false,
          },
          {
            label: "Calories Burned",
            data: datasets.map((d) => d.burned),
            borderColor: "#f6ad55",
            tension: 0.4,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Calories",
            },
          },
        },
      },
    })
  }
  
  async function initializeNutritionChart(headers) {
    const ctx = document.getElementById("nutritionChart").getContext("2d")
    const nutritionData = await fetchNutritionTotals(headers)
  
    if (!nutritionData) return
  
    const total = nutritionData.protein.current + nutritionData.carbs.current + nutritionData.fats.current
    const proteinPercentage = (nutritionData.protein.current / total) * 100
    const carbsPercentage = (nutritionData.carbs.current / total) * 100
    const fatsPercentage = (nutritionData.fats.current / total) * 100
  
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Protein", "Carbs", "Fats"],
        datasets: [
          {
            data: [proteinPercentage, carbsPercentage, fatsPercentage],
            backgroundColor: ["#667eea", "#f6ad55", "#68d391"],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
        cutout: "70%",
      },
    })
  
    // Update legend values
    document.querySelectorAll(".legend-value").forEach((element, index) => {
      const values = [proteinPercentage, carbsPercentage, fatsPercentage]
      element.textContent = `${values[index].toFixed(1)}%`
    })
  }
  
  async function updateQuickStats(headers) {
    const [nutritionData, waterStats, activities, goals] = await Promise.all([
      fetchNutritionTotals(headers),
      fetchWaterStats(headers),
      fetchActivities(headers),
      fetchGoals(headers),
    ])
  
    // Get calorie goal from goals
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  
    const calorieGoal =
      goals.find(
        (g) =>
          g.type === "calories" &&
          g.period === "daily" &&
          new Date(g.created_at) >= startOfDay &&
          new Date(g.created_at) < endOfDay,
      )?.target || 0
  
    // Update calories progress
    const caloriesCard = document.querySelector(".stat-card.calories")
    const caloriesBurned = activities.reduce((sum, activity) => sum + activity.calories_burned, 0)
  
    const calorieProgressPercentage = calorieGoal > 0 ? (caloriesBurned / calorieGoal) * 100 : 0
  
    caloriesCard.querySelector(".stat-value").textContent =
      `${formatNumber(caloriesBurned)} / ${formatNumber(calorieGoal)} kcal`
  
    caloriesCard.querySelector(".progress").style.width = `${Math.min(calorieProgressPercentage, 100)}%`
  
    caloriesCard.querySelector(".stat-subtitle").textContent =
      caloriesBurned >= calorieGoal ? "Completed!" : `${formatNumber(calorieGoal - caloriesBurned)} kcal remaining`
  
    // Update activities
    const totalDuration = activities.reduce((sum, activity) => sum + activity.duration, 0)
    const activitiesCard = document.querySelector(".stat-card.activities")
  
    const exerciseGoal =
      goals.find(
        (g) =>
          g.type === "exercise" &&
          g.period === "daily" &&
          new Date(g.created_at) >= startOfDay &&
          new Date(g.created_at) < endOfDay,
      )?.target || 0
  
    const exerciseProgressPercentage = exerciseGoal > 0 ? (totalDuration / exerciseGoal) * 100 : 0
  
    activitiesCard.querySelector(".stat-value").textContent = `${totalDuration} / ${exerciseGoal} mins`
  
    activitiesCard.querySelector(".progress").style.width = `${Math.min(exerciseProgressPercentage, 100)}%`
  
    activitiesCard.querySelector(".stat-subtitle").textContent =
      totalDuration >= exerciseGoal
        ? "Completed!"
        : exerciseGoal > 0
          ? `${Math.max(0, exerciseGoal - totalDuration)} mins remaining`
          : "No exercise goal set"
  
    // Filter goals to find today's water goal using the `timestamp` field
    const waterGoal =
      goals.find(
        (g) =>
          g.type === "water" &&
          g.period === "daily" &&
          new Date(g.created_at) >= startOfDay &&
          new Date(g.created_at) < endOfDay,
      )?.target || 0
  
    const waterConsumed = waterStats?.current || 0
    const waterCard = document.querySelector(".stat-card.water")
  
    // Update the UI
    waterCard.querySelector(".stat-value").textContent = `${waterConsumed.toFixed(1)} / ${waterGoal.toFixed(1)}ml`
  
    waterCard.querySelector(".progress").style.width = `${Math.max(0, Math.min((waterConsumed / waterGoal) * 100, 100))}%`
  
    waterCard.querySelector(".stat-subtitle").textContent =
      waterGoal > 0 ? `${(waterGoal - waterConsumed).toFixed(1)}ml remaining today` : "No water goal set for today"
  
    // Update goals progress
    const todayGoals = goals.filter(
      (goal) => new Date(goal.created_at) >= startOfDay && new Date(goal.created_at) < endOfDay,
    )
  
    const completedGoals = todayGoals.filter((goal) => {
      switch (goal.type) {
        case "calories":
          return caloriesBurned >= goal.target
        case "exercise":
          return totalDuration >= goal.target
        case "water":
          return waterConsumed >= goal.target
        default:
          return goal.current >= goal.target
      }
    })
  
    const totalGoals = todayGoals.length
    const completedGoalsCount = completedGoals.length
  
    const goalsCard = document.querySelector(".stat-card.goals")
    goalsCard.querySelector(".stat-value").textContent = `${completedGoalsCount} / ${totalGoals}`
  
    const goalProgressPercentage = totalGoals > 0 ? (completedGoalsCount / totalGoals) * 100 : 0
    goalsCard.querySelector(".progress").style.width = `${goalProgressPercentage}%`
  
    goalsCard.querySelector(".stat-subtitle").textContent =
      totalGoals > 0
        ? completedGoalsCount >= totalGoals
          ? "All goals completed!"
          : `${totalGoals - completedGoalsCount} goals remaining`
        : "No goals set for today"
  
    // Update goal dots
    const goalsGrid = goalsCard.querySelector(".goals-grid")
    if (goalsGrid) {
      goalsGrid.innerHTML = Array(totalGoals)
        .fill(0)
        .map((_, i) => `<span class="goal-dot ${i < completedGoalsCount ? "completed" : ""}"></span>`)
        .join("")
    }
  }
  
  async function updateRecentActivities(headers) {
    const activities = await fetchActivities(headers)
    const activityList = document.querySelector(".activity-list")
  
    activityList.innerHTML = activities
      .slice(0, 5)
      .map(
        (activity) => `
          <div class="activity-item">
              <div class="activity-time-line">
                  <span class="time-dot"></span>
                  <span class="time-line"></span>
              </div>
              <div class="activity-card">
                  <span class="activity-icon">${getActivityIcon(activity.type)}</span>
                  <div class="activity-details">
                      <h4>${activity.type}</h4>
                      <p>${activity.duration} minutes • ${activity.calories_burned} calories</p>
                  </div>
                  <span class="activity-time">${formatTimeAgo(new Date(activity.created_at))}</span>
              </div>
          </div>
      `,
      )
      .join("")
  }
  
  // Update all dashboard data
  async function updateDashboard(headers) {
    await Promise.all([
      updateQuickStats(headers),
      updateRecentActivities(headers),
      initializeWeeklyProgressChart(headers),
      initializeNutritionChart(headers),
    ])
  }
  
  // Helper function to format numbers
  function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  
  // Helper function to format dates
  function formatDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }
  
  // Helper function to get activity icons
  function getActivityIcon(type) {
    const icons = {
      Running: "🏃‍♂️",
      Cycling: "🚴",
      Swimming: "🏊‍♂️",
      Yoga: "🧘‍♀️",
      Gym: "🏋️‍♂️",
      Walking: "🚶‍♂️",
    }
    return icons[type] || "⚡"
  }
  
  // Helper function to format time ago
  function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000)
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    }
  
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit)
      if (interval >= 1) {
        return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`
      }
    }
    return "Just now"
  }
  
  // Update the date in the header
  function updateHeaderDate() {
    const dateElement = document.querySelector(".date")
    dateElement.textContent = formatDate(new Date())
  }
  
  