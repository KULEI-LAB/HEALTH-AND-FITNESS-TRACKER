// Replace the entire content of activity-logging.js with this:

document.addEventListener("DOMContentLoaded", () => {
    initializeActivityLogging()
    loadRecentActivities()
    updateSummary()
  
    // Initialize date input with current date
    document.getElementById("date").valueAsDate = new Date()
  })
  
  function initializeActivityLogging() {
    const form = document.getElementById("activity-form")
  
    form.addEventListener("submit", (e) => {
      e.preventDefault()
      logActivity()
    })
  
    // Initialize logout button
    document.getElementById("logout-btn").addEventListener("click", () => {
      localStorage.removeItem("token")
      window.location.href = "login.html"
    })
  }
  
  async function logActivity() {
    // Get form values
    const activityType = document.getElementById("activity-type").value
    const duration = document.getElementById("duration").value
    const intensity = document.getElementById("intensity").value
    const date = document.getElementById("date").value
    const notes = document.getElementById("notes").value
  
    // Validate input
    if (!activityType || !duration || !intensity || !date) {
      showNotification("Please fill in all required fields", "error")
      return
    }
  
    // Calculate estimated calories burned
    const caloriesBurned = calculateCaloriesBurned(activityType, duration, intensity)
  
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:3000/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: activityType,
          duration: Number.parseInt(duration),
          intensity: intensity,
          caloriesBurned: caloriesBurned,
          date: date,
          notes: notes,
        }),
      })
  
      if (!response.ok) {
        throw new Error("Failed to log activity")
      }
  
      // Reset form
      document.getElementById("activity-form").reset()
      document.getElementById("date").valueAsDate = new Date()
  
      showNotification("Activity logged successfully!", "success")
  
      // Refresh display
      loadRecentActivities()
      updateSummary()
    } catch (error) {
      console.error("Error logging activity:", error)
      showNotification("Error logging activity", "error")
    }
  }
  
  async function loadRecentActivities() {
    try {
      const token = localStorage.getItem("token")
      const today = new Date().toISOString().split("T")[0] // Get current date in YYYY-MM-DD format
      const response = await fetch(`http://localhost:3000/api/activities?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to fetch activities")
      }
  
      const data = await response.json()
      const tableBody = document.getElementById("activities-table-body")
  
      tableBody.innerHTML = data.activities
        .map(
          (activity) => `
              <tr>
                  <td>${formatDate(activity.date)}</td>
                  <td>${capitalizeFirstLetter(activity.type)}</td>
                  <td>${activity.duration} mins</td>
                  <td>${capitalizeFirstLetter(activity.intensity)}</td>
                  <td>${activity.calories_burned} kcal</td>
                  <td>
                      <button onclick="editActivity(${activity.id})" class="action-btn">✏️</button>
                      <button onclick="deleteActivity(${activity.id})" class="action-btn">🗑️</button>
                  </td>
              </tr>
          `,
        )
        .join("")
    } catch (error) {
      console.error("Error loading activities:", error)
      showNotification("Error loading activities", "error")
    }
  }
  
  async function editActivity(activityId) {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3000/api/activities/${activityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to fetch activity")
      }
  
      const activity = await response.json()
  
      // Populate form with activity data
      document.getElementById("activity-type").value = activity.type
      document.getElementById("duration").value = activity.duration
      document.getElementById("intensity").value = activity.intensity
      document.getElementById("date").value = activity.date
      document.getElementById("notes").value = activity.notes || ""
  
      // Scroll to form
      document.querySelector(".activity-form-container").scrollIntoView({ behavior: "smooth" })
    } catch (error) {
      console.error("Error editing activity:", error)
      showNotification("Error editing activity", "error")
    }
  }
  
  async function deleteActivity(activityId) {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`http://localhost:3000/api/activities/${activityId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to delete activity")
      }
  
      showNotification("Activity deleted successfully", "success")
      loadRecentActivities()
      updateSummary()
    } catch (error) {
      console.error("Error deleting activity:", error)
      showNotification("Error deleting activity", "error")
    }
  }
  
  async function updateSummary() {
    try {
      const token = localStorage.getItem("token")
      const today = new Date().toISOString().split("T")[0]
  
      const response = await fetch(`http://localhost:3000/api/activities?date=${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
  
      if (!response.ok) {
        throw new Error("Failed to fetch activities")
      }
  
      const data = await response.json()
      const todayActivities = data.activities
  
      // Calculate totals
      const totalCalories = todayActivities.reduce((sum, activity) => sum + activity.calories_burned, 0)
      const totalMinutes = todayActivities.reduce((sum, activity) => sum + activity.duration, 0)
      const totalActivities = todayActivities.length
  
      // Update summary cards using IDs
      document.getElementById("calories-summary").textContent = totalCalories
      document.getElementById("minutes-summary").textContent = totalMinutes
      document.getElementById("activities-summary").textContent = totalActivities
    } catch (error) {
      console.error("Error updating summary:", error)
      showNotification("Error updating summary", "error")
    }
  }
  
  // Keep the existing helper functions
  function calculateCaloriesBurned(activity, duration, intensity) {
    const baseMultipliers = {
      running: 8,
      walking: 4,
      cycling: 6,
      swimming: 7,
      yoga: 3,
      strength: 5,
    }
  
    const intensityMultipliers = {
      low: 0.8,
      moderate: 1,
      high: 1.2,
    }
  
    const baseRate = baseMultipliers[activity] || 5
    return Math.round(duration * baseRate * intensityMultipliers[intensity])
  }
  
  function showNotification(message, type = "success") {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
  }
  
  function formatDate(dateString) {
    const options = { year: "numeric", month: "short", day: "numeric" }
    return new Date(dateString).toLocaleDateString(undefined, options)
  }
  
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  
  