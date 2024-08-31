const axios = require("axios");
const fs = require("fs");
const path = require("path");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");
const { Console } = require("console");

class GameBot {
  constructor() {
    this.queryId = null;
    this.token = null;
    this.userInfo = null;
    this.currentGameId = null;
    this.firstAccountEndTime = null;
  }

  log(msg, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    switch (type) {
      case "success":
        console.log(`[*] ${msg}`.green);
        break;
      case "error":
        console.log(`[!] ${msg}`.red);
        break;
      case "warning":
        console.log(`[*] ${msg}`.yellow);
        break;
      default:
        console.log(`[*] ${msg}`.blue);
    }
  }

  async headers(token = null) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: "https://hamsterkombatgame.io",
      referer: "https://hamsterkombatgame.io",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async getUserInfo() {
    try {
      const response = await axios.post(
        "https://api.hamsterkombatgame.io/auth/account-info",null,
        { headers: await this.headers(this.token) }
      );
      
      if (response.status === 200) {
        this.userInfo = response.data.accountInfo;
        return this.userInfo;
      } else {
        this.log("Token không hợp lệ", "warning");
        return null;
      }
    } catch (error) {
      this.log(`Không thể lấy thông tin người dùng: ${error.message}`, "error");
      return null;
    }
  }

  async autoTap() {
    try {
      const response = await axios.post(
        "https://api.hamsterkombatgame.io/clicker/tap",
        {
          availableTaps: 9500,
          count: 527,
          timestamp: Date.now()
        },
        { headers: await this.headers(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể auto tap: ${error.message}`, "error");
      return null;
    }
  }
  async boostFullTap() {
    try {
      const response = await axios.post(
        "https://api.hamsterkombatgame.io/clicker/boosts-for-buy",
        null,
        { headers: await this.headers(this.token) }
      );
      return response.data?.boostsForBuy;
    } catch (error) {
      this.log(`Không thể get boost: ${error.message}`, "error");
      return null;
    }
  }
  async buyBoostFullTap() {
    try {
      const response = await axios.post(
        "https://api.hamsterkombatgame.io/clicker/buy-boost",
        {
          boostId: "BoostFullAvailableTaps",
          timestamp: Date.now()
        },
        { headers: await this.headers(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể get boost: ${error.message}`, "error");
      return null;
    }
  }

  async autoSync() {
    try {
      const response = await axios.post(
        "https://api.hamsterkombatgame.io/clicker/sync",
        null,
        { headers: await this.headers(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể bắt đầu Sync: ${error.message}`, "error");
      return null;
    }
  }

  async Countdown(seconds) {
    for (let i = Math.floor(seconds); i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`[*] Chờ ${i} giây để tiếp tục...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    this.token  = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean)[0];


    while (true) {
        const userInfo = await this.getUserInfo();
        
        if (userInfo === null) {
          this.log(
            "Không thể lấy thông tin người dùng, bỏ qua tài khoản này",
            "error"
          );
          continue;
        }

        console.log(`========== Tài khoản ${userInfo.name} ==========`);

        await this.autoTap();
        await this.autoSync();
        
        const bootFull = await this.boostFullTap();
        
        if(bootFull && bootFull.length > 0){
          if(bootFull && bootFull[2].cooldownSeconds==0){
            await this.buyBoostFullTap();
            await this.autoTap();
          }
        }

        this.log(`Hoàn thành xử lý tài khoản ${userInfo.name}`, "success");
        console.log("");
          await this.Countdown(3600);
    }
  }
}

if (require.main === module) {
  const gameBot = new GameBot();
  gameBot.main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
