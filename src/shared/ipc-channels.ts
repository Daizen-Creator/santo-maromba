export const IPC_CHANNELS = {
  // Profile
  GET_PROFILE: 'profile:get',
  SAVE_PROFILE: 'profile:save',
  CONFIRM_INITIAL_HISTORY: 'profile:confirm-initial-history',

  // Weight
  GET_WEIGHT_HISTORY: 'weight:get-history',
  ADD_WEIGHT_RECORD: 'weight:add',
  UPDATE_WEIGHT_RECORD: 'weight:update',
  DELETE_WEIGHT_RECORD: 'weight:delete',
  GET_WEIGHT_ANALYTICS: 'weight:get-analytics',

  // Targets & Nutrition
  CALCULATE_TARGETS: 'nutrition:calculate-targets',
  GET_DASHBOARD_SUMMARY: 'dashboard:get-summary',
  ADD_LOGGED_MEAL: 'nutrition:add-logged-meal',
  GET_DAILY_MEALS: 'nutrition:get-daily-meals',
  GET_RECENTLY_USED_FOODS: 'nutrition:get-recently-used-foods',
  GET_MEAL_HISTORY: 'nutrition:get-meal-history',
  GET_NUTRITION_ANALYTICS: 'nutrition:get-analytics',
  GET_NUTRITION_DISTRIBUTION: 'nutrition:get-distribution',
  COPY_DAILY_MEALS: 'nutrition:copy-daily-meals',
  GET_MEAL_TEMPLATES: 'nutrition:get-meal-templates',
  SAVE_MEAL_TEMPLATE: 'nutrition:save-meal-template',
  APPLY_MEAL_TEMPLATE: 'nutrition:apply-meal-template',
  SAVE_DAILY_MEAL: 'nutrition:save-daily-meal',
  ADD_HYDRATION_LOG: 'hydration:add-log',

  // Photos & Physique
  GET_PHOTOS: 'photos:get',
  ADD_PHOTO: 'photos:add',
  UPDATE_PHOTO_NOTES: 'photos:update-notes',
  DELETE_PHOTO: 'photos:delete',

  // Measurements
  GET_MEASUREMENTS: 'measurements:get',
  SAVE_MEASUREMENT: 'measurements:save',

  // Physique projections
  SAVE_PHYSIQUE_PROJECTION: 'projections:save-physique',
  GET_PHYSIQUE_PROJECTIONS: 'projections:get-physique-history',

  // Nutrition Catalog & Substitutions
  GET_FOODS: 'nutrition:get-foods',
  SET_FOOD_FAVORITE: 'nutrition:set-food-favorite',
  ADD_CUSTOM_FOOD: 'nutrition:add-custom-food',
  UPDATE_CUSTOM_FOOD: 'nutrition:update-custom-food',
  GET_RECIPES: 'nutrition:get-recipes',
  SET_RECIPE_FAVORITE: 'nutrition:set-recipe-favorite',
  SET_RECIPE_SERVINGS: 'nutrition:set-recipe-servings',
  GET_PANTRY: 'nutrition:get-pantry',
  UPDATE_PANTRY: 'nutrition:update-pantry',
  GET_SUBSTITUTIONS: 'nutrition:get-substitutions',
  FIND_RECIPES_FROM_PANTRY: 'nutrition:find-from-pantry',

  // Workout
  GET_EXERCISES: 'workout:get-exercises',
  ADD_EXERCISE_MEDIA: 'workout:add-exercise-media',
  DELETE_EXERCISE_MEDIA: 'workout:delete-exercise-media',
  GET_WORKOUT_SESSIONS: 'workout:get-sessions',
  LOG_WORKOUT_SESSION: 'workout:log-session',
  GENERATE_WORKOUT_SPLIT: 'workout:generate-split',
  GET_WORKOUT_TEMPLATES: 'workout:get-templates',
  SAVE_WORKOUT_TEMPLATE: 'workout:save-template',

  // System
  GET_VISUAL_CUSTOMIZATION: 'visual:get-customization',
  SAVE_VISUAL_CUSTOMIZATION: 'visual:save-customization',
  GET_CUSTOMIZATION_MEDIA: 'visual:get-media',
  ADD_CUSTOMIZATION_MEDIA: 'visual:add-media',
  DELETE_CUSTOMIZATION_MEDIA: 'visual:delete-media',
  UPDATE_STATUS: 'system:update-status',
  APP_GET_VERSION: 'app:get-version',
  WINDOW_GET_MAXIMIZED: 'window:get-maximized',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window:toggle-maximize',
  WINDOW_CLOSE: 'window:close',
  BACKUP_EXPORT: 'system:backup-export',
  BACKUP_RESTORE: 'system:backup-restore'
} as const;
