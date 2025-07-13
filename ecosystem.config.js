module.exports = {
    apps: [
      {
        name: "lazy-bot",
        script: "bun",
        args: ".",
        env: {
          CLIENT_TOKEN: "xxx",
          CLIENT_ID: "xxx",
          GUILD_ID: "xxx",
          DATABASE_URL: "xxx",
          SELF_BOT_TOKEN: "xxx",
          PANEL_EMAIL: "xxx",
          PANEL_PASSWORD: "xxx"
        }
      }
    ]
  };
  