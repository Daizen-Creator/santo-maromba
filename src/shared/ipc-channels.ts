export const IPC_CHANNELS = {
  // Profile
  GET_PROFILE: 'profile:get',
  GET_PROFILE_GOAL_HISTORY: 'profile:get-goal-history',
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
  APPLY_WEEKLY_MEAL_TEMPLATE: 'nutrition:apply-weekly-meal-template',
  REORDER_DAILY_MEALS: 'nutrition:reorder-daily-meals',
  SAVE_DAILY_MEAL: 'nutrition:save-daily-meal',
  DELETE_DAILY_MEAL: 'nutrition:delete-daily-meal',
  RESTORE_DAILY_MEAL: 'nutrition:restore-daily-meal',
  GET_MEAL_PHOTOS: 'nutrition:get-meal-photos',
  ADD_MEAL_PHOTO: 'nutrition:add-meal-photo',
  DELETE_MEAL_PHOTO: 'nutrition:delete-meal-photo',
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
  SET_RECIPE_FINAL_WEIGHT: 'nutrition:set-recipe-final-weight',
  SET_RECIPE_FEEDBACK: 'nutrition:set-recipe-feedback',
  GET_FOOD_PORTION_PREFERENCES: 'nutrition:get-food-portion-preferences',
  SAVE_FOOD_PORTION_PREFERENCE: 'nutrition:save-food-portion-preference',
  GET_PERSONAL_DIARY_ENTRIES: 'diary:get-entries',
  SAVE_PERSONAL_DIARY_ENTRY: 'diary:save-entry',
  DELETE_PERSONAL_DIARY_ENTRY: 'diary:delete-entry',
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
  GET_WORKOUT_SCHEDULE: 'workout:get-schedule',
  SAVE_WORKOUT_SCHEDULE: 'workout:save-schedule',

  // Custom body measurements
  GET_CUSTOM_MEASUREMENTS: 'measurements:get-custom',
  SAVE_CUSTOM_MEASUREMENT_DEFINITION: 'measurements:save-custom-definition',
  SAVE_CUSTOM_MEASUREMENT: 'measurements:save-custom-value',

  // System
  GET_VISUAL_CUSTOMIZATION: 'visual:get-customization',
  SAVE_VISUAL_CUSTOMIZATION: 'visual:save-customization',
  GET_MEASUREMENT_UNITS: 'settings:get-measurement-units',
  SAVE_MEASUREMENT_UNITS: 'settings:save-measurement-units',
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
