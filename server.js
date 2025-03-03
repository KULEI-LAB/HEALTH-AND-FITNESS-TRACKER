const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const {
  createUser,
  validateUser,
  getUserById,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalsByUserId,
  createActivity,
  getActivitiesByUserId,
  updateActivity,
  deleteActivity,
  logWaterIntake,
  getWaterLogs,
  deleteWaterLog,
  getWaterStats,
  logFood,
  getFoodLogs,
  getDailyNutritionTotals,
  getCalorieAnalytics,
  getMacroAnalytics,
  getActivityAnalytics,
  getProgressSummary,
  getCaloriesBurned,
  db,
} = require("./db")

const app = express()
const PORT = 3000
const JWT_SECRET = "your_jwt_secret" // In production, use environment variable

// Middleware
app.use(cors())
app.use(express.json())

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await getUserById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "Invalid token" })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" })
  }
}

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    // Basic validation
    const requiredFields = ["name", "email", "password", "age", "gender", "weight", "height"]
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` })
      }
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ message: "Invalid email format" })
    }

    const result = await createUser(req.body)
    res.status(201).json({ message: "User registered successfully", userId: result.id })
  } catch (error) {
    if (error.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ message: "Email already registered" })
    } else {
      console.error("Registration error:", error)
      res.status(500).json({ message: "Error registering user" })
    }
  }
})

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await validateUser(email, password)

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" })

    res.json({
      message: "Login successful",
      token,
      username: user.name,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Error during login" })
  }
})

// Protected route example
app.get("/api/user-profile", authenticateToken, async (req, res) => {
  try {
    res.json({ user: req.user })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ message: "Error fetching user profile" })
  }
})

// Get user's goals
app.get("/api/goals", authenticateToken, async (req, res) => {
  try {
    const period = req.query.period
    const goals = await getGoalsByUserId(req.user.id, period)
    res.json({ goals })
  } catch (error) {
    console.error("Error fetching goals:", error)
    res.status(500).json({ message: "Error fetching goals" })
  }
})

// Create new goal
app.post("/api/goals", authenticateToken, async (req, res) => {
  try {
    const result = await createGoal(req.user.id, req.body)
    res.status(201).json({ message: "Goal created successfully", goalId: result.id })
  } catch (error) {
    console.error("Error creating goal:", error)
    res.status(500).json({ message: "Error creating goal" })
  }
})

// Update goal
app.put("/api/goals/:goalId", authenticateToken, async (req, res) => {
  try {
    const result = await updateGoal(req.params.goalId, req.user.id, req.body)
    if (result.changes === 0) {
      return res.status(404).json({ message: "Goal not found or unauthorized" })
    }
    res.json({ message: "Goal updated successfully" })
  } catch (error) {
    console.error("Error updating goal:", error)
    res.status(500).json({ message: "Error updating goal" })
  }
})

// Delete goal
app.delete("/api/goals/:goalId", authenticateToken, async (req, res) => {
  try {
    const result = await deleteGoal(req.params.goalId, req.user.id)
    if (result.changes === 0) {
      return res.status(404).json({ message: "Goal not found or unauthorized" })
    }
    res.json({ message: "Goal deleted successfully" })
  } catch (error) {
    console.error("Error deleting goal:", error)
    res.status(500).json({ message: "Error deleting goal" })
  }
})

//activity routes
// Get user's activities
app.get("/api/activities", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date
    const activities = await getActivitiesByUserId(req.user.id, date)
    res.json({ activities })
  } catch (error) {
    console.error("Error fetching activities:", error)
    res.status(500).json({ message: "Error fetching activities" })
  }
})

// Create new activity
app.post("/api/activities", authenticateToken, async (req, res) => {
  try {
    const result = await createActivity(req.user.id, req.body)
    res.status(201).json({ message: "Activity logged successfully", activityId: result.id })
  } catch (error) {
    console.error("Error logging activity:", error)
    res.status(500).json({ message: "Error logging activity" })
  }
})

// Update activity
app.put("/api/activities/:activityId", authenticateToken, async (req, res) => {
  try {
    const result = await updateActivity(req.params.activityId, req.user.id, req.body)
    if (result.changes === 0) {
      return res.status(404).json({ message: "Activity not found or unauthorized" })
    }
    res.json({ message: "Activity updated successfully" })
  } catch (error) {
    console.error("Error updating activity:", error)
    res.status(500).json({ message: "Error updating activity" })
  }
})

// Delete activity
app.delete("/api/activities/:activityId", authenticateToken, async (req, res) => {
  try {
    const result = await deleteActivity(req.params.activityId, req.user.id)
    if (result.changes === 0) {
      return res.status(404).json({ message: "Activity not found or unauthorized" })
    }
    res.json({ message: "Activity deleted successfully" })
  } catch (error) {
    console.error("Error deleting activity:", error)
    res.status(500).json({ message: "Error deleting activity" })
  }
})

// Add water logging routes to server.js
app.post("/api/water/log", authenticateToken, async (req, res) => {
  try {
    const result = await logWaterIntake(req.user.id, req.body)
    res.status(201).json(result)
  } catch (error) {
    console.error("Error logging water intake:", error)
    res.status(500).json({ message: "Error logging water intake" })
  }
})

app.get("/api/water/logs", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const logs = await getWaterLogs(req.user.id, date)
    res.json({ logs })
  } catch (error) {
    console.error("Error fetching water logs:", error)
    res.status(500).json({ message: "Error fetching water logs" })
  }
})

app.delete("/api/water/log/:logId", authenticateToken, async (req, res) => {
  try {
    const result = await deleteWaterLog(req.params.logId, req.user.id)
    if (result.changes === 0) {
      return res.status(404).json({ message: "Log not found or unauthorized" })
    }
    res.json({ message: "Water log deleted successfully" })
  } catch (error) {
    console.error("Error deleting water log:", error)
    res.status(500).json({ message: "Error deleting water log" })
  }
})

app.get("/api/water/stats", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const stats = await getWaterStats(req.user.id, date)
    res.json(stats)
  } catch (error) {
    console.error("Error fetching water stats:", error)
    res.status(500).json({ message: "Error fetching water stats" })
  }
})

/**
 * Food logging routes
 */
app.post("/api/food/log", authenticateToken, async (req, res) => {
  try {
    const result = await logFood(req.user.id, {
      ...req.body,
      date: req.body.date || new Date().toISOString().split("T")[0],
    })
    res.status(201).json({ message: "Food logged successfully", logId: result.id })
  } catch (error) {
    console.error("Error logging food:", error)
    res.status(500).json({ message: "Error logging food" })
  }
})

app.get("/api/food/logs", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const logs = await getFoodLogs(req.user.id, date)
    res.json({ logs })
  } catch (error) {
    console.error("Error fetching food logs:", error)
    res.status(500).json({ message: "Error fetching food logs" })
  }
})

app.get("/api/food/nutrition-totals", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const totals = await getDailyNutritionTotals(req.user.id, date)
    res.json(totals)
  } catch (error) {
    console.error("Error fetching nutrition totals:", error)
    res.status(500).json({ message: "Error fetching nutrition totals" })
  }
})

// Add these new endpoints to server.js
// Get foods for autocomplete
app.get("/api/foods/search", authenticateToken, async (req, res) => {
  const searchTerm = req.query.term

  try {
    const query = `
            SELECT * FROM foods 
            WHERE name LIKE ? 
            LIMIT 10
        `

    db.all(query, [`%${searchTerm}%`], (err, foods) => {
      if (err) {
        console.error("Error searching foods:", err)
        res.status(500).json({ message: "Error searching foods" })
      } else {
        res.json({ foods })
      }
    })
  } catch (error) {
    console.error("Error searching foods:", error)
    res.status(500).json({ message: "Error searching foods" })
  }
})

// Get food details by name
app.get("/api/foods/details/:name", authenticateToken, async (req, res) => {
  try {
    const query = `
            SELECT * FROM foods 
            WHERE name = ?
            LIMIT 1
        `

    db.get(query, [req.params.name], (err, food) => {
      if (err) {
        console.error("Error fetching food details:", err)
        res.status(500).json({ message: "Error fetching food details" })
      } else if (!food) {
        res.status(404).json({ message: "Food not found" })
      } else {
        res.json(food)
      }
    })
  } catch (error) {
    console.error("Error fetching food details:", error)
    res.status(500).json({ message: "Error fetching food details" })
  }
})

// Analytics routes
app.get("/api/analytics/calories", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const data = await getCalorieAnalytics(req.user.id, startDate, endDate)
    res.json(data)
  } catch (error) {
    console.error("Error fetching calorie analytics:", error)
    res.status(500).json({ message: "Error fetching calorie analytics" })
  }
})

app.get("/api/analytics/macros", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const data = await getMacroAnalytics(req.user.id, startDate, endDate)
    res.json(data)
  } catch (error) {
    console.error("Error fetching macro analytics:", error)
    res.status(500).json({ message: "Error fetching macro analytics" })
  }
})

app.get("/api/analytics/activities", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const data = await getActivityAnalytics(req.user.id, startDate, endDate)
    res.json(data)
  } catch (error) {
    console.error("Error fetching activity analytics:", error)
    res.status(500).json({ message: "Error fetching activity analytics" })
  }
})

app.get("/api/analytics/progress-summary", authenticateToken, async (req, res) => {
  try {
    const { currentStartDate, currentEndDate, previousStartDate, previousEndDate } = req.query
    const data = await getProgressSummary(
      req.user.id,
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate,
    )
    res.json(data)
  } catch (error) {
    console.error("Error fetching progress summary:", error)
    res.status(500).json({ message: "Error fetching progress summary" })
  }
})

// Add this new endpoint for fetching calories burned
app.get("/api/activities/calories", authenticateToken, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0]
    const calories = await getCaloriesBurned(req.user.id, date)
    res.json({ current: calories })
  } catch (error) {
    console.error("Error fetching calories burned:", error)
    res.status(500).json({ message: "Error fetching calories burned" })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

