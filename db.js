const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcrypt")
const path = require("path")
const fs = require("fs")

// Create database connection
const db = new sqlite3.Database(path.join(__dirname, "fitness_tracker.db"), (err) => {
  if (err) {
    console.error("Error connecting to database:", err)
  } else {
    console.log("Connected to SQLite database")
    initializeDatabase()
    seedFoodData()
  }
})

// Initialize database tables
function initializeDatabase() {
  db.run(
    `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            weight REAL,
            height REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
    (err) => {
      if (err) {
        console.error("Error creating users table:", err)
      } else {
        console.log("Users table initialized")
      }
    },
  )

  db.run(`
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            target REAL NOT NULL,
            current REAL DEFAULT 0,
            period TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `)

  db.run(`
        CREATE TABLE IF NOT EXISTS activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            duration INTEGER NOT NULL,
            intensity TEXT NOT NULL,
            calories_burned INTEGER NOT NULL,
            date TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `)

  // Foods  table
  db.run(`
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            calories REAL NOT NULL DEFAULT 0,
            protein REAL NOT NULL DEFAULT 0,
            carbs REAL NOT NULL DEFAULT 0,
            fats REAL NOT NULL DEFAULT 0,
            vitamins TEXT
         )
     `)

  // Water logging table

  db.run(`
        CREATE TABLE IF NOT EXISTS water_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            notes TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `)

  // Food logging table
  db.run(`
        CREATE TABLE IF NOT EXISTS food_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            meal_time TEXT NOT NULL,
            description TEXT NOT NULL,
            portion TEXT NOT NULL,
            calories INTEGER NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fats REAL NOT NULL,
            date TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `)
}

function seedFoodData() {
    const foodsFilePath = path.join(__dirname, "foods.json");
  
    // Check if the JSON file exists
    if (!fs.existsSync(foodsFilePath)) {
      console.error("Error: foods.json file not found.");
      return;
    }
  
    // Read and parse the foods.json file
    fs.readFile(foodsFilePath, "utf-8", async (err, data) => {
      if (err) {
        console.error("Error reading foods.json file:", err);
        return;
      }
  
      let foods;
      try {
        foods = JSON.parse(data);
  
        // Remove duplicates from the JSON data based on the 'name' field
        const uniqueFoods = Array.from(new Map(foods.map((food) => [food.name, food])).values());
  
        console.log(`Found ${uniqueFoods.length} unique food items to seed.`);
  
        // Iterate through each food item and insert only if it does not exist
        for (const food of uniqueFoods) {
          try {
            await insertFoodIfNotExists(food);
          } catch (insertErr) {
            console.error(`Error inserting food "${food.name}":`, insertErr);
          }
        }
  
        console.log("Seeding completed.");
      } catch (parseError) {
        console.error("Error parsing foods.json:", parseError);
      }
    });
  }
  
  // Helper function to insert food if it does not already exist
  function insertFoodIfNotExists(food) {
    return new Promise((resolve, reject) => {
      const checkQuery = `SELECT COUNT(*) as count FROM foods WHERE name = ?`;
      const insertQuery = `
        INSERT INTO foods (name, calories, protein, carbs, fats, vitamins)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
  
      const { name, calories = 0, proteins = 0, carbohydrates = 0, fats = 0, vitamins = [] } = food;
  
      db.get(checkQuery, [name], (checkErr, row) => {
        if (checkErr) {
          console.error(`Error checking food "${name}":`, checkErr);
          reject(checkErr);
        } else if (row.count === 0) {
          // Food is not already in the database, insert it
          db.run(insertQuery, [name, calories, proteins, carbohydrates, fats, vitamins.join(",")], (insertErr) => {
            if (insertErr) {
              reject(insertErr);
            } else {
              console.log(`Successfully inserted food: ${name}`);
              resolve();
            }
          });
        } else {
          console.log(`Food "${name}" already exists in the database. Skipping.`);
          resolve(); // Resolve even if skipped
        }
      });
    });
  }
  

// User registration
async function createUser(userData) {
  const { name, email, password, age, gender, weight, height } = userData

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    return new Promise((resolve, reject) => {
      const query = `
                INSERT INTO users (name, email, password, age, gender, weight, height)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `

      db.run(query, [name, email, hashedPassword, age, gender, weight, height], function (err) {
        if (err) {
          reject(err)
        } else {
          resolve({ id: this.lastID })
        }
      })
    })
  } catch (error) {
    throw error
  }
}

// User login
async function validateUser(email, password) {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE email = ?"

    db.get(query, [email], async (err, user) => {
      if (err) {
        reject(err)
      } else if (!user) {
        resolve(null)
      } else {
        try {
          const validPassword = await bcrypt.compare(password, user.password)
          if (validPassword) {
            // Don't send password back
            delete user.password
            resolve(user)
          } else {
            resolve(null)
          }
        } catch (error) {
          reject(error)
        }
      }
    })
  })
}

// Get user by ID
function getUserById(id) {
  return new Promise((resolve, reject) => {
    const query = "SELECT id, name, email, age, gender, weight, height FROM users WHERE id = ?"

    db.get(query, [id], (err, user) => {
      if (err) {
        reject(err)
      } else {
        resolve(user)
      }
    })
  })
}

// Goals CRUD operations
async function createGoal(userId, goalData) {
  const { type, target, period } = goalData

  return new Promise((resolve, reject) => {
    const query = `
            INSERT INTO goals (user_id, type, target, period)
            VALUES (?, ?, ?, ?)
        `

    db.run(query, [userId, type, target, period], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ id: this.lastID })
      }
    })
  })
}

async function updateGoal(goalId, userId, goalData) {
  const { current, target, period } = goalData

  return new Promise((resolve, reject) => {
    const query = `
            UPDATE goals 
            SET current = ?, target = ?, period = ?
            WHERE id = ? AND user_id = ?
        `

    db.run(query, [current, target, period, goalId, userId], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

async function deleteGoal(goalId, userId) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM goals WHERE id = ? AND user_id = ?"

    db.run(query, [goalId, userId], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

async function getGoalsByUserId(userId, period = null) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM goals WHERE user_id = ?"
    const params = [userId]

    if (period) {
      query += " AND period = ?"
      params.push(period)
    }

    db.all(query, params, (err, goals) => {
      if (err) {
        reject(err)
      } else {
        resolve(goals)
      }
    })
  })
}

//activity crud

async function createActivity(userId, activityData) {
  const { type, duration, intensity, caloriesBurned, date, notes } = activityData

  return new Promise((resolve, reject) => {
    const query = `
            INSERT INTO activities (user_id, type, duration, intensity, calories_burned, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `

    db.run(query, [userId, type, duration, intensity, caloriesBurned, date, notes], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ id: this.lastID })
      }
    })
  })
}

async function getActivitiesByUserId(userId, date = null) {
  return new Promise((resolve, reject) => {
    let query = "SELECT * FROM activities WHERE user_id = ?"
    const params = [userId]

    if (date) {
      query += " AND date = ?"
      params.push(date)
    }

    query += " ORDER BY date DESC, created_at DESC"

    db.all(query, params, (err, activities) => {
      if (err) {
        reject(err)
      } else {
        resolve(activities)
      }
    })
  })
}

async function updateActivity(activityId, userId, activityData) {
  const { type, duration, intensity, caloriesBurned, date, notes } = activityData

  return new Promise((resolve, reject) => {
    const query = `
            UPDATE activities 
            SET type = ?, duration = ?, intensity = ?, calories_burned = ?, date = ?, notes = ?
            WHERE id = ? AND user_id = ?
        `

    db.run(query, [type, duration, intensity, caloriesBurned, date, notes, activityId, userId], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

async function deleteActivity(activityId, userId) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM activities WHERE id = ? AND user_id = ?"

    db.run(query, [activityId, userId], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

// Water logging table
async function logWaterIntake(userId, waterData) {
  const { amount, notes } = waterData

  return new Promise((resolve, reject) => {
    const query = `
            INSERT INTO water_logs (user_id, amount, notes)
            VALUES (?, ?, ?)
        `

    db.run(query, [userId, amount, notes], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({
          id: this.lastID,
          amount,
          notes,
          timestamp: new Date().toISOString(),
        })
      }
    })
  })
}

async function getWaterLogs(userId, date) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT * FROM water_logs 
            WHERE user_id = ? 
            AND date(timestamp) = date(?)
            ORDER BY timestamp DESC
        `

    db.all(query, [userId, date], (err, logs) => {
      if (err) {
        reject(err)
      } else {
        resolve(logs)
      }
    })
  })
}

async function deleteWaterLog(logId, userId) {
  return new Promise((resolve, reject) => {
    const query = "DELETE FROM water_logs WHERE id = ? AND user_id = ?"

    db.run(query, [logId, userId], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ changes: this.changes })
      }
    })
  })
}

async function getWaterStats(userId, date) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          (SELECT SUM(amount) FROM water_logs WHERE user_id = ? AND date(timestamp) = date(?)) as total,
          (SELECT target FROM goals WHERE user_id = ? AND type = 'water' AND date(created_at) = date(?) LIMIT 1) as goal
      `;
  
      db.get(query, [userId, date, userId, date], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            current: result.total || 0,
            goal: result.goal || 2000, // Default to 2000ml if no goal exists
          });
        }
      });
    });
  }
  

// Food logging

async function logFood(userId, foodData) {
  const { meal_time, description, portion, calories, protein, carbs, fats, date } = foodData

  return new Promise((resolve, reject) => {
    const query = `
            INSERT INTO food_logs (user_id, meal_time, description, portion, calories, protein, carbs, fats, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `

    db.run(query, [userId, meal_time, description, portion, calories, protein, carbs, fats, date], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve({ id: this.lastID })
      }
    })
  })
}

async function getFoodLogs(userId, date) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT * FROM food_logs 
            WHERE user_id = ? AND date = ?
            ORDER BY created_at DESC
        `

    db.all(query, [userId, date], (err, logs) => {
      if (err) {
        reject(err)
      } else {
        resolve(logs)
      }
    })
  })
}

async function getDailyNutritionTotals(userId, date) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT 
                SUM(calories) as total_calories,
                SUM(protein) as total_protein,
                SUM(carbs) as total_carbs,
                SUM(fats) as total_fats,
                (SELECT target FROM goals 
                 WHERE user_id = ? 
                 AND type = 'calories' 
                 AND period = 'daily' 
                 LIMIT 1) as calories_goal
            FROM food_logs 
            WHERE user_id = ? AND date = ?
        `

    db.get(query, [userId, userId, date], (err, totals) => {
      if (err) {
        reject(err)
      } else {
        resolve({
          calories: {
            current: totals.total_calories || 0,
          },
          protein: {
            current: totals.total_protein || 0,
          },
          carbs: {
            current: totals.total_carbs || 0,
          },
          fats: {
            current: totals.total_fats || 0,
          },
        })
      }
    })
  })
}

async function getCalorieAnalytics(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT 
                fl.date,
                SUM(fl.calories) as calories_consumed,
                (SELECT target FROM goals 
                 WHERE user_id = ? AND type = 'calories' 
                 AND period = 'daily' 
                 LIMIT 1) as calorie_goal,
                (SELECT SUM(calories_burned) 
                 FROM activities 
                 WHERE user_id = ? AND date = fl.date) as calories_burned
            FROM food_logs fl
            WHERE fl.user_id = ? 
            AND fl.date BETWEEN ? AND ?
            GROUP BY fl.date
            ORDER BY fl.date
        `

    db.all(query, [userId, userId, userId, startDate, endDate], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

async function getMacroAnalytics(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT 
                date,
                SUM(protein) as total_protein,
                SUM(carbs) as total_carbs,
                SUM(fats) as total_fats
            FROM food_logs
            WHERE user_id = ? 
            AND date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
        `

    db.all(query, [userId, startDate, endDate], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

async function getActivityAnalytics(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT 
                date,
                SUM(duration) as total_duration,
                SUM(calories_burned) as total_calories_burned
            FROM activities
            WHERE user_id = ? 
            AND date BETWEEN ? AND ?
            GROUP BY date
            ORDER BY date
        `

    db.all(query, [userId, startDate, endDate], (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

async function getProgressSummary(userId, currentStartDate, currentEndDate, previousStartDate, previousEndDate) {
  const [currentCalories, previousCalories] = await Promise.all([
    getDailyAverageCalories(userId, currentStartDate, currentEndDate),
    getDailyAverageCalories(userId, previousStartDate, previousEndDate),
  ])

  const [currentActivity, previousActivity] = await Promise.all([
    getDailyAverageActivity(userId, currentStartDate, currentEndDate),
    getDailyAverageActivity(userId, previousStartDate, previousEndDate),
  ])

  const [currentGoals, previousGoals] = await Promise.all([
    getGoalCompletion(userId, currentStartDate, currentEndDate),
    getGoalCompletion(userId, previousStartDate, previousEndDate),
  ])

  return {
    calories: {
      current: currentCalories,
      trend: calculateTrendPercentage(currentCalories, previousCalories),
    },
    activity: {
      current: currentActivity,
      trend: calculateTrendPercentage(currentActivity, previousActivity),
    },
    goals: {
      current: currentGoals,
      trend: calculateTrendPercentage(currentGoals, previousGoals),
    },
  }
}

// Helper functions
async function getDailyAverageCalories(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT AVG(daily_calories) as average_calories
            FROM (
                SELECT date, SUM(calories) as daily_calories
                FROM food_logs
                WHERE user_id = ? AND date BETWEEN ? AND ?
                GROUP BY date
            )
        `

    db.get(query, [userId, startDate, endDate], (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.average_calories || 0)
      }
    })
  })
}

async function getDailyAverageActivity(userId, startDate, endDate) {
  return new Promise((resolve, reject) => {
    const query = `
            SELECT AVG(daily_duration) as average_duration
            FROM (
                SELECT date, SUM(duration) as daily_duration
                FROM activities
                WHERE user_id = ? AND date BETWEEN ? AND ?
                GROUP BY date
            )
        `

    db.get(query, [userId, startDate, endDate], (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.average_duration || 0)
      }
    })
  })
}

async function getGoalCompletion(userId, startDate, endDate) {
  // This is a simplified example - you might want to modify based on your specific goal structure
  return new Promise((resolve, reject) => {
    const query = `
            SELECT 
                COUNT(CASE WHEN current >= target THEN 1 END) * 100.0 / COUNT(*) as completion_rate
            FROM goals
            WHERE user_id = ? 
            AND created_at BETWEEN ? AND ?
        `

    db.get(query, [userId, startDate, endDate], (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.completion_rate || 0)
      }
    })
  })
}

function calculateTrendPercentage(current, previous) {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

// Add this new function to get calories burned
async function getCaloriesBurned(userId, date) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT SUM(calories_burned) as total_calories
      FROM activities
      WHERE user_id = ? AND date = ?
    `

    db.get(query, [userId, date], (err, result) => {
      if (err) {
        reject(err)
      } else {
        resolve(result.total_calories || 0)
      }
    })
  })
}

module.exports = {
  db,
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
}

