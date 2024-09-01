const axios = require("axios");
const fs = require("fs");
const path = require("path");
const colors = require("colors");
const readline = require("readline");
const moment = require('moment');
const { DateTime } = require("luxon");
const { Console } = require("console");

class GameBot {
  constructor() {
    this.queryId = null;
    this.token = null;
    this.tokens = [];
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

  // Hamster Combat
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

  // Rocky Rabbit
  async headers_rb(token = null) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: "https://play.rockyrabbit.io",
      referer: "https://play.rockyrabbit.io/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    };
    if (token) {
      headers["Authorization"] = `${token}`;
    }
    return headers;
  }

  async getUserInfo_rb() {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/account/start",null,
        { headers: await this.headers_rb(this.token) }
      );
      
      if (response.status === 200) {
        this.userInfo = response.data.account;
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

  async autoTap_rb() {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/clicker/tap",
        {
          count: 1160
        },
        { headers: await this.headers_rb(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể auto tap: ${error.message}`, "error");
      return null;
    }
  }
  async boostFullTap_rb() {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/boosts/list",
        null,
        { headers: await this.headers_rb(this.token) }
      );
      return response.data?.boostsList;
    } catch (error) {
      this.log(`Không thể get boost: ${error.message}`, "error");
      return null;
    }
  }
  async buyBoostFullTap_rb() {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/boosts",
        {
          boostId: "full-available-taps",
          timezone: "Asia/Saigon"
        },
        { headers: await this.headers_rb(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể get boost: ${error.message}`, "error");
      return null;
    }
  }

  async autoSync_rb() {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/mine/sync",
        null,
        { headers: await this.headers_rb(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể bắt đầu Sync: ${error.message}`, "error");
      return null;
    }
  }

  async upgradeEvent_rb(eventname) {
    try {
      const response = await axios.post(
        "https://api.rockyrabbit.io/api/v1/mine/upgrade",
        {
          upgradeId: eventname
        },
        { headers: await this.headers_rb(this.token) }
      );
      return response.data;
    } catch (error) {
      this.log(`Không thể bắt đầu Sync: ${error.message}`, "error");
      return null;
    }
  }

  // Cat Gold Miner
  async headers_cgm(token = null) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: "https://game.catgoldminer.ai",
      referer: "https://game.catgoldminer.ai/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    };
    if (token) {
      headers["Authorization"] = `${token}`;
    }
    return headers;
  }

  async getUserInfo_cgm() {
    try {
      const response = await axios.post(
        "https://api-server1.catgoldminer.ai/auth/login",{refBy: ""},
        { headers: await this.headers_rb(this.token) }
      );
      
      if (response.status === 200) {
        this.userInfo = response.data.data;
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

  async autoSync_cgm() {
    try {
      const response = await axios.post(
        "https://api-server1.catgoldminer.ai/users/claimIdleCurrency2",
        {
          hashSoftCurrencyProfile: null,
          isClaimWithHardCurrency: false,
          locationID: "742",
          mineID: 0
        },
        { headers: await this.headers_rb(this.token) }
      );
      const response1 = await axios.post(
        "https://api-server1.catgoldminer.ai/users/claimIdleCurrency2",
        {
          hashSoftCurrencyProfile: null,
          isClaimWithHardCurrency: false,
          locationID: "742",
          mineID: 1
        },
        { headers: await this.headers_rb(this.token) }
      );
      const response2 = await axios.post(
        "https://api-server1.catgoldminer.ai/users/claimIdleCurrency2",
        {
          hashSoftCurrencyProfile: null,
          isClaimWithHardCurrency: false,
          locationID: "742",
          mineID: 2
        },
        { headers: await this.headers_rb(this.token) }
      );
      return {data:response.data, data1:response1.data,data2:response2.data};
    } catch (error) {
      this.log(`Không thể bắt đầu Sync: ${error.message}`, "error");
      return null;
    }
  }

  // Yes Coin
  async headers_yc(token = null) {
    const headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      origin: "https://www.yescoin.gold",
      referer: "https://www.yescoin.gold/",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
    };
    if (token) {
      headers["token"] = `${token}`;
    }
    return headers;
  }

  async getUserInfo_yc() {
    try {
      const response = await axios.get(
        "https://api-backend.yescoin.gold/account/getAccountInfo",
        { headers: await this.headers_yc(this.token) }
      );
      
      if (response.status === 200) {
        this.userInfo = response.data.data;
        return this.userInfo;
      } else {
        this.log("Token không hợp lệ", "warning");
        return null;
      }
    } catch (error) {
      console.log(error);
      this.log(`Không thể lấy thông tin người dùng: ${error.message}`, "error");
      return null;
    }
  }

  async autoTap_yc() {
    try {
      const response = await axios.post(
        "https://api-backend.yescoin.gold/game/collectCoin",
        1600
        ,
        { headers: await this.headers_yc(this.token) }
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
    this.tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'));

    while (true) {
      // Hamster Combat
      console.log(`========== Hamster Combat ==========`);
      const tockenHamsters = this.tokens.hamster;
      for (let i = 0; i < tockenHamsters.length; i++) {
        this.token = tockenHamsters[i];
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
      }

      // Rocky Rabbit
      console.log(`========== Rocky Rabbit ==========`);
      const tockenRockyRabbits = this.tokens.rockyrabbit;
      for (let i = 0; i < tockenRockyRabbits.length; i++) {
        this.token = tockenRockyRabbits[i];
        const userInfo = await this.getUserInfo_rb();
        
        if (userInfo === null) {
          this.log(
            "Không thể lấy thông tin người dùng, bỏ qua tài khoản này",
            "error"
          );
          continue;
        }
        console.log(`========== Tài khoản ${userInfo.uid} ==========`);

        await this.autoTap_rb();
        await this.autoSync_rb();
        
        const bootFull = await this.boostFullTap_rb();
        if(bootFull && bootFull.length > 0){
          var current = moment(new Date()).subtract({ minutes: 30}).unix();
          if(bootFull && bootFull[1].lastUpgradeAt <= current){
            await this.buyBoostFullTap_rb();
            await this.autoTap_rb();
          }
        }
        var currentHour = moment().hour();
        if(currentHour >=13 && currentHour <= 15){
          await upgradeEvent_rb("lunch_fighter");
        }

        this.log(`Hoàn thành xử lý tài khoản ${userInfo.uid}`, "success");
        console.log("");
      }

      // Cat Gold Miner
      console.log(`========== Cat Gold Miner ==========`);
      const tockenCatGoldMiner = this.tokens.catgoldminer;
      for (let i = 0; i < tockenCatGoldMiner.length; i++) {
        this.token = tockenCatGoldMiner[i];
        const userInfo = await this.getUserInfo_cgm();
        
        if (userInfo === null) {
          this.log(
            "Không thể lấy thông tin người dùng, bỏ qua tài khoản này",
            "error"
          );
          continue;
        }
        console.log(`========== Tài khoản ${userInfo.name} ==========`);

        await this.autoSync_cgm();

        this.log(`Hoàn thành xử lý tài khoản ${userInfo.name}`, "success");
        console.log("");
      }

      // Yes Coin
      console.log(`========== Yes Coin ==========`);
      const tockenYesCoin = this.tokens.yescoin;
      for (let i = 0; i < tockenYesCoin.length; i++) {
        this.token = tockenYesCoin[i];

        const userInfo = await this.getUserInfo_yc();
        
        if (userInfo === null) {
          this.log(
            "Không thể lấy thông tin người dùng, bỏ qua tài khoản này",
            "error"
          );
          continue;
        }
        console.log(`========== Tài khoản ${userInfo.userId} ==========`);

        await this.autoTap_yc();

        this.log(`Hoàn thành xử lý tài khoản ${userInfo.userId}`, "success");
        console.log("");
      }

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
