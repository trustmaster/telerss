// Configurations for the application
// TODO: add user specific settings management

export const defaultSettings = {
  // Maximum number of users per bot instance
  maxUsers: 100,
  // Maximum number of subscriptions per user
  maxSubscriptionsPerUser: 1000,
  // Posts to load on new subscription
  postsToLoadOnNewSub: 5,
  // Default refresh rate for new subscriptions
  defaultRefreshRate: 15, // in minutes
}
