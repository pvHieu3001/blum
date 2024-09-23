const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');

class QuiddichAPIClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://quidditch.lumoz.org",
            "Referer": "https://quidditch.lumoz.org/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`);
                break;        
            case 'error':
                console.log(`[${timestamp}] [!] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [*] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [*] ${msg}`.blue);
        }
    }

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            const timestamp = new Date().toLocaleTimeString();
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[${timestamp}] [*] Chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    encodeToBase64(str) {
        return Buffer.from(str).toString('base64');
    }

    async getUserInfo(authorization) {
        const url = "https://quidditch-api.lumoz.org/api/quidditch/user_info";
        const headers = { ...this.headers, "Authorization": authorization };
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error getting user info: ${error.message}`, 'error');
            return null;
        }
    }

    async getNewUserGift(authorization, invitationCode) {
        const url = `https://quidditch-api.lumoz.org/api/quidditch/new_user_gift?invitation_code=${invitationCode}`;
        const headers = { ...this.headers, "Authorization": authorization };
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error getting new user gift: ${error.message}`, 'error');
            return null;
        }
    }

    async getCollectInfo(authorization) {
        const url = "https://quidditch-api.lumoz.org/api/quidditch/collect_info";
        const headers = { ...this.headers, "Authorization": authorization };
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`Error getting collect info: ${error.message}`, 'error');
            return null;
        }
    }

    async collectReward(authorization, item, amount) {
        const url = `https://quidditch-api.lumoz.org/api/quidditch/collect?collect_item=${item}&collect_amount=${amount}`;
        const headers = { ...this.headers, "Authorization": authorization };
        try {
            const response = await axios.get(url, { headers });
            return response.data;
        } catch (error) {
            this.log(`Nhận Snitch không thành công: ${error.message}`, 'error');
            return null;
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const rawAuthorization = data[i];
                const authorization = this.encodeToBase64(rawAuthorization);
                
                let userInfo = await this.getUserInfo(authorization);
                if (!userInfo) continue;

                if (!userInfo.is_exist) {
                    const giftResult = await this.getNewUserGift(authorization, '75U1E');
                    if (giftResult && giftResult.describe === "You have got golden snitch gift successfully.") {
                        this.log("Bạn đã nhận được quà snitch vàng thành công", 'success');
                    }
                    userInfo = await this.getUserInfo(authorization);
                }

                if (userInfo.is_exist) {
                    const userData = JSON.parse(decodeURIComponent(rawAuthorization.split('user=')[1].split('&')[0]));
                    console.log(`========== Tài khoản ${i + 1} | ${userData.username.green} ==========`);
                    this.log(`Points: ${userInfo.points}`);
                    this.log(`Snitch: ${userInfo.snitch}`);
                    this.log(`Stone: ${userInfo.stone}`);

                    const collectInfo = await this.getCollectInfo(authorization);
                    if (collectInfo) {
                        this.log(`Snitch có sẵn: ${collectInfo.available_snitch}`, 'info');
                        this.log(`USDT có sẵn: ${collectInfo.usdt}`, 'info');

                        if (collectInfo.usdt > 0) {
                            const usdtAmount = Math.floor(collectInfo.usdt * 1000000);
                            const usdtResult = await this.collectReward(authorization, 'usdt', usdtAmount);
                            if (usdtResult && usdtResult.describe === "Collect usdt successfully.") {
                                this.log(`Nhặt USDT thành công: ${usdtAmount}`, 'success');
                            }
                        }

                        if (collectInfo.available_snitch > 0) {
                            const randomPercentage = Math.random() * (0.9 - 0.7) + 0.7;
                            const totalCollect = Math.floor(collectInfo.available_snitch * randomPercentage);
                            this.log(`Thu thập ${(randomPercentage * 100).toFixed(2)}% snitch có sẵn`.magenta);
                            
                            let collected = 0;
                            for (let j = 0; j < 3; j++) {
                                const remainingToCollect = totalCollect - collected;
                                if (remainingToCollect <= 0) break;
                        
                                const amountToCollect = j === 2 ? remainingToCollect : Math.floor(Math.random() * remainingToCollect);
                                const snitchResult = await this.collectReward(authorization, 'snitch', amountToCollect);
                                if (snitchResult) {
                                    collected += amountToCollect;
                                    this.log(`Nhận Snitch thành công | đã lụm ${snitchResult.available_snitch}/${collectInfo.snitch_amount}`, 'success');
                                }
                                
                                await this.countdown(5);
                            }
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(60);
        }
    }
}

const client = new QuiddichAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});