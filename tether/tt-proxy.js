const { HttpsProxyAgent } = require('https-proxy-agent');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { DateTime } = require('luxon');
const colors = require('colors');
const readline = require('readline');

class Tether {
    headers(authString) {
        return {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Access-Control-Allow-Origin": "*",
            "Authorization": `tma ${authString}`,
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        };
    }

    async getUserData(authString, proxy) {
        const url = "https://tap-tether.org/server/login";
        const headers = this.headers(authString);
        const proxyAgent = new HttpsProxyAgent(proxy);
        const response = await axios.get(url, { headers, httpsAgent: proxyAgent });
        return response.data.userData;
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async clickAPI(authString, remainingClicks, proxy) {
        const currentTime = Math.floor(DateTime.now().toSeconds());
        const url = `https://tap-tether.org/server/clicks?clicks=${remainingClicks}&lastClickTime=${currentTime}`;
        const headers = this.headers(authString);
        const proxyAgent = new HttpsProxyAgent(proxy);
        
        try {
            const response = await axios.get(url, { headers, httpsAgent: proxyAgent });
            return response.data;
        } catch (error) {
            this.log(`${'Lỗi rồi'.red}`);
            console.log(error);
            return null;
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', {
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        const proxyFile = path.join(__dirname, 'proxy.txt');
        const proxies = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        if (data.length !== proxies.length) {
            throw new Error('Số lượng tài khoản và proxy không khớp nhau');
        }
    
        while (true) {
            for (let no = 0; no < data.length; no++) {
                const authString = data[no];
                const proxy = proxies[no];
    
                try {
                    const proxyIP = await this.checkProxyIP(proxy);
                    const userData = await this.getUserData(authString, proxy);
                    if (!userData) {
                        this.log('Không có dữ liệu người dùng nào được trả về'.red);
                        continue;
                    }
    
                    const balance = userData.balance / 1000000;
                    const balanceGold = userData.balanceGold / 1000000;
                    const limitClicks = parseInt(userData.limitClicks, 10);
                    const remainingClicks = parseInt(userData.remainingClicks, 10);
                    const firstName = userData.firstName;
    
                    console.log(`========== Tài khoản ${no + 1} | ${firstName.green} | IP: ${proxyIP}==========`);
                    this.log(`${'Balance:'.green} ${balance}`);
                    this.log(`${'Balance Gold:'.green} ${balanceGold}`);
                    this.log(`${'Năng lượng:'.green} ${remainingClicks}/${limitClicks}`);
    
                    const clickResponse = await this.clickAPI(authString, remainingClicks, proxy);
                    if (clickResponse) {
                        this.log(`${'Năng lượng còn lại:'.green} ${clickResponse.remainingClicks}`);
                        this.log(`${'Đã click được'.green} ${clickResponse.usedClicks} ${'nhát!'.green}`);
                    }
                } catch (error) {
                    this.log(`${'Lỗi thông tin người dùng'.red}`);
                    console.log(error);
                }
            }
    
            await this.waitWithCountdown(5 * 60);
        }
    }
}

if (require.main === module) {
    const tether = new Tether();
    tether.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
