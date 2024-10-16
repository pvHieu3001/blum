const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const { performance } = require('perf_hooks');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Pocketfi {
    constructor() {
        this.headers = {
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'Host': 'rubot.pocketfi.org',
            'Origin': 'https://pocketfi.app',
            'Referer': 'https://pocketfi.app/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Mobile Safari/537.36',
            'sec-ch-ua': '"Google Chrome";v="80", "Chromium";v="80", "Not.A/Brand";v="99"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"'
        };
        this.line = '~'.repeat(42).white;
    }

    nextClaimIs(lastClaim) {
        const nextClaim = lastClaim + 3600;
        const now = Math.floor(Date.now() / 1000);
        const kqua = Math.round(nextClaim - now);
        return kqua;
    }

    async http(url, headers, data = null, proxy = null) {
        while (true) {
            try {
                let res;
                let agent = null;
                if (proxy) {
                    agent = new HttpsProxyAgent(proxy);
                }
                if (data === null) {
                    res = await axios.get(url, { headers, httpsAgent: agent });
                } else {
                    res = await axios.post(url, data, { headers, httpsAgent: agent });
                }
                if (typeof res.data !== 'object') {
                    this.log('Không nhận được phản hồi JSON hợp lệ !'.red);
                    await this.sleep(2000);
                    continue;
                }
                return res;
            } catch (error) {
                this.log(`Lỗi kết nối: ${error.message}`.red);
                await this.sleep(1000);
                continue;
            }
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

    countdown(t) {
        return new Promise(resolve => {
            const timer = setInterval(() => {
                const gio = String(Math.floor(t / 3600)).padStart(2, '0');
                const phut = String(Math.floor((t % 3600) / 60)).padStart(2, '0');
                const giay = String(t % 60).padStart(2, '0');
                process.stdout.write(`\rCần chờ ${gio}:${phut}:${giay} \r`.white);
                t--;
                if (t < 0) {
                    clearInterval(timer);
                    process.stdout.write('\r                          \r', 'utf-8', () => {});
                    resolve();
                }
            }, 1000);
        });
    }
    
    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async checkAndClaimDailyBoost(tgData, proxy = null) {
        const checkUrl = 'https://rubot.pocketfi.org/mining/taskExecuting';
        const claimUrl = 'https://rubot.pocketfi.org/boost/activateDailyBoost';
        const headers = { ...this.headers, telegramRawData: tgData };
    
        try {
            const checkRes = await this.http(checkUrl, headers, null, proxy);
            if (checkRes.data && checkRes.data.tasks && checkRes.data.tasks.daily) {
                const dailyTask = checkRes.data.tasks.daily.find(task => task.code === 'dailyReward');
                if (dailyTask && dailyTask.doneAmount === 0) {
                    const claimRes = await this.http(claimUrl, headers, {}, proxy, 'POST');
                    this.log(`Điểm danh hàng ngày thành công!`.green);
                } else {
                    this.log('Đã điểm danh ngày hôm nay!'.yellow);
                }
            } else {
                this.log('Không thể kiểm tra trạng thái Daily boost'.red);
            }
        } catch (error) {
            this.log(`Lỗi khi kiểm tra hoặc claim Daily boost: ${error.message}`.red);
        }
    }

    async getUserMining(tgData, proxy = null) {
        const url = 'https://rubot.pocketfi.org/mining/getUserMining';
        const urlClaim = 'https://rubot.pocketfi.org/mining/claimMining';
        const headers = { ...this.headers, telegramRawData: tgData };
        const res = await this.http(url, headers, null, proxy);
        if (res.data.length <= 0) {
            this.log('Không nhận được phản hồi !'.red);
            return 60;
        }
        const balance = res.data.userMining.gotAmount;
        const lastClaim = res.data.userMining.dttmLastClaim / 1000;
        this.log(`Balance : ${balance}`.green);
        await this.checkAndClaimDailyBoost(tgData, proxy);
        const canClaim = this.nextClaimIs(lastClaim);
        if (canClaim >= 0) {
            this.log(`Chưa đến giờ claim, còn ${canClaim} giây!`.yellow);
            return canClaim;
        }

        const resClaim = await this.http(urlClaim, headers, '', proxy);
        if (resClaim.data.length <= 0) {
            this.log('Không nhận được phản hồi !'.red);
            return 60;
        }
        const newBalance = resClaim.data.userMining.gotAmount;
        this.log(`Balance sau khi claim : ${newBalance}`.green);
        return 3600;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const proxyFile = path.join(__dirname, 'proxy.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        const proxies = fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
        if (data.length <= 0 || proxies.length <= 0) {
            this.log('Chưa có tài khoản hoặc proxy nào được thêm!'.red);
            process.exit();
        }
        if (data.length !== proxies.length) {
            this.log('Số lượng tài khoản và proxy không khớp nhau!'.red);
            process.exit();
        }
        this.log(`Tool được chia sẻ tại kênh telegram Dân Cày Airdrop (@dancayairdrop)`.green);
        console.log(this.line);
        let index = 0;
        let firstAccountCanClaim = 0;
        while (true) {
            const listCountdown = [];
            const start = performance.now();
            for (let i = index; i < data.length; i++) {
                const tgData = data[i];
                const userData = JSON.parse(decodeURIComponent(tgData.split('&')[1].split('=')[1]));
                const firstName = userData.first_name;
                const proxy = proxies[i].trim();
                try {
                    const proxyIP = await this.checkProxyIP(proxy);
                    console.log(`========== Tài khoản ${i + 1}/${data.length} | ${firstName.green} | ip: ${proxyIP} ==========`);
                    const res = await this.getUserMining(tgData, proxy);
                    if (i === 0) {
                        firstAccountCanClaim = res; 
                    }
                    listCountdown.push(res);
                    index = i + 1;
                } catch (error) {
                    console.error(`Proxy ${proxy} không hoạt động: ${error.message}`.red);
                    await this.sleep(2000);
                    break;
                }
                await this.sleep(5000);
            }
            const end = performance.now();
            const total = Math.floor((end - start) / 1000);
            const min = Math.min(...listCountdown);
            const countdownTime = (index > 0) ? firstAccountCanClaim : min;
            if ((countdownTime - total) > 0) {
                await this.countdown(countdownTime - total);
            }
			index = 0;
        }
    }          
}

if (require.main === module) {
    process.on('SIGINT', () => {
        process.exit();
    });
    (new Pocketfi()).main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}
