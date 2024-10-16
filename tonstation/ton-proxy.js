const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');
const { HttpsProxyAgent } = require('https-proxy-agent');

class TonStation {
    constructor() {
        this.baseURL = 'https://tonstation.app';
        this.headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/json',
            'Origin': 'https://tonstation.app',
            'Referer': 'https://tonstation.app/app/',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Ch-Ua-Platform': '"Android"',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        };
        this.skipTaskIds = ["66dad41d9b1e65019ad30629", "66f560c1c6fc8ba931b33420"];
        this.proxies = fs.readFileSync('proxy.txt', 'utf8').split('\n').filter(Boolean);
    }

    log(msg, type = 'info') {
        const timestamp = DateTime.now().toLocaleString(DateTime.TIME_24_WITH_SECONDS);
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
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
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async makeRequest(method, url, data = null, token = null, proxyAgent) {
        const headers = { ...this.headers };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            url,
            headers,
            httpsAgent: proxyAgent
        };

        if (data) {
            config.data = data;
        }

        try {
            const response = await axios(config);
            return response.data;
        } catch (error) {
            this.log(`Request error: ${error.message}`, 'error');
            return null;
        }
    }

    async authenticate(initData, proxyAgent) {
        const url = `${this.baseURL}/userprofile/api/v1/users/auth`;
        const payload = { initData };

        try {
            const response = await this.makeRequest('POST', url, payload, null, proxyAgent);
            if (response) {
                return response;
            } else {
                throw new Error(`Authentication failed`);
            }
        } catch (error) {
            this.log(`Authentication error: ${error.message}`, 'error');
            return null;
        }
    }

    async getFarmStatus(token, userId, proxyAgent) {
        const url = `${this.baseURL}/farming/api/v1/farming/${userId}/running`;
        try {
            const response = await this.makeRequest('GET', url, null, token, proxyAgent);
            if (response) {
                return response.data;
            } else {
                this.log(`Get farming status failed!`, 'error');
            }
        } catch (error) {
            this.log(`Get farming status failed: ${error.message}`, 'error');
        }
    }

    async startFarm(token, userId, proxyAgent) {
        const url = `${this.baseURL}/farming/api/v1/farming/start`;
        const payload = {
            "userId": userId.toString(),
            "taskId": "1"
        }
        try {
            const response = await this.makeRequest('POST', url, payload, token, proxyAgent);
            if (response) {
                const timeEnd = DateTime.fromISO(response.data.timeEnd);
                this.log(`Bắt đầu farm thành công, kết thúc sau ${timeEnd.toLocaleString(DateTime.DATETIME_FULL)}`, 'success');
            } else {
                this.log(`Bắt đầu farm thất bại!`, 'error');
            }
        } catch (error) {
            this.log(`Bắt đầu farm thất bại: ${error.message}`, 'error');
        }
    }

    async claimFarm(token, userId, farmId, proxyAgent) {
        const url = `${this.baseURL}/farming/api/v1/farming/claim`;
        const payload = {
            "userId": userId.toString(),
            "taskId": farmId
        }
        try {
            const response = await this.makeRequest('POST', url, payload, token, proxyAgent);
            if (response) {
                this.log(`Claim farming thành công, nhận được ${response.data.amount}`, 'success');
            } else {
                this.log(`Claim farming thất bại!`, 'error');
            }
        } catch (error) {
            this.log(`Claim farming thất bại: ${error.message}`, 'error');
        }
    }

    async getTask(token, userId, proxyAgent) {
        const url = `${this.baseURL}/quests/api/v1/quests?userId=${userId}`;
        try {
            const response = await this.makeRequest('GET', url, null, token, proxyAgent);
            if (response) {
                return response.data;
            } else {
                this.log(`Không lấy được danh sách nhiệm vụ!`, 'error');
            }
        } catch (error) {
            this.log(`Không lấy được danh sách nhiệm vụ: ${error.message}`, 'error');
        }
    }

    async startTask(token, userId, task, proxyAgent) {
        const url = `${this.baseURL}/quests/api/v1/start`;
        const payload = {
            "userId": userId.toString(),
            "questId": task.id,
            "project": task.project
        }
        try {
            await this.makeRequest('POST', url, payload, token, proxyAgent);
        } catch (error) {
            this.log(`Bắt đầu nhiệm vụ ${task.description} thất bại: ${error.message}`, 'error');
        }
    }

    async claimTask(token, userId, task, proxyAgent) {
        const url = `${this.baseURL}/quests/api/v1/claim`;
        const payload = {
            "userId": userId.toString(),
            "questId": task.id,
            "project": task.project
        }
        try {
            const response = await this.makeRequest('POST', url, payload, token, proxyAgent);
            if (response) {
                this.log(`Làm nhiệm vụ ${task.description} thành công | Phần thưởng ${task.reward.amount} SOON`, 'success');
            } else {
                this.log(`Làm nhiệm vụ ${task.description} thất bại!`, 'error');
            }
        } catch (error) {
            this.log(`Làm nhiệm vụ ${task.description} thất bại: ${error.message}`, 'error');
        }
    }

    async main() {
        console.log(`Anh em gặp lỗi thì nhớ lấy lại query_id để chạy nhé!`);
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const userId = userData.id;
                const firstName = userData.first_name;
                const proxy = this.proxies[i];
                const proxyAgent = new HttpsProxyAgent(proxy);

                let proxyIP = 'Unknown';
                try {
                    proxyIP = await this.checkProxyIP(proxy);
                } catch (error) {
                    this.log(`Không thể kiểm tra IP của proxy: ${error.message}`, 'warning');
                    continue;
                }

                console.log(`========== Tài khoản ${i + 1} | ${firstName.green} | ip: ${proxyIP} ==========`);
                
                const authResult = await this.authenticate(initData, proxyAgent);
                if (authResult) {
                    this.log('Đăng nhập thành công!', 'success');
                    const { accessToken } = authResult;

                    const farmStatus = await this.getFarmStatus(accessToken, userId, proxyAgent);
                    if (farmStatus && farmStatus.length > 0) {
                        const currentFarm = farmStatus[0];
                        const timeEnd = DateTime.fromISO(currentFarm.timeEnd);
                        this.log(`Thời gian hoàn thành farm ${timeEnd.toLocaleString(DateTime.DATETIME_FULL)}`, 'info');

                        if (DateTime.now() > timeEnd) {
                            await this.claimFarm(accessToken, userId, currentFarm._id, proxyAgent);
                            await this.startFarm(accessToken, userId, proxyAgent);
                        } else {
                            this.log(`Còn lại ${timeEnd.diffNow().toFormat("hh'h' mm'm' ss's'")}.`, 'info');
                        }
                    } else {
                        this.log("Bắt đầu farm...", 'info');
                        await this.startFarm(accessToken, userId, proxyAgent);
                    }

                    const tasks = await this.getTask(accessToken, userId, proxyAgent);
                    if (tasks) {
                        for (const task of tasks) {
                            if (this.skipTaskIds.includes(task.id)) {
                                this.log(`Bỏ qua nhiệm vụ có ID ${task.id}`, 'warning');
                                continue;
                            }
                            await this.startTask(accessToken, userId, task, proxyAgent);
                            await this.claimTask(accessToken, userId, task, proxyAgent);
                        }
                    }

                } else {
                    this.log(`Đăng nhập thất bại cho tài khoản ${userId}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(480 * 60);
        }
    }
}

const client = new TonStation();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});