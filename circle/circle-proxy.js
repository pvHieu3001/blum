const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class TonCircle {
    constructor() {
        this.headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://bot.toncircle.org",
            "Referer": "https://bot.toncircle.org/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.proxies = this.loadProxies();
    }

    loadProxies() {
        const proxyFile = path.join(__dirname, 'proxy.txt');
        return fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
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
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
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

    async makeRequest(url, method, data, headers, proxy) {
        const proxyAgent = new HttpsProxyAgent(proxy);
        try {
            const config = {
                method,
                url,
                headers,
                httpsAgent: proxyAgent,
                ...(data && { data })
            };
            const response = await axios(config);
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(authorization, proxy) {
        const url = `https://api.toncircle.org/user/login?c=${Date.now()}`;
        const headers = { ...this.headers, "Authorization": authorization };
        return this.makeRequest(url, 'post', {}, headers, proxy);
    }

    async getProfile(authorization, proxy) {
        const url = `https://api.toncircle.org/user/profile?c=${Date.now()}`;
        const headers = { ...this.headers, "Authorization": authorization };
        return this.makeRequest(url, 'get', null, headers, proxy);
    }

    async claimDailyBonus(authorization, proxy) {
        const url = `https://api.toncircle.org/user/bonus/daily?c=${Date.now()}`;
        const headers = { ...this.headers, "Authorization": authorization };
        const payload = { withMultiplier: false };
        return this.makeRequest(url, 'post', payload, headers, proxy);
    }

    async getTasksList(authorization, type = 'regular', proxy) {
        let url;
        switch(type) {
            case 'regular':
                url = `https://api.toncircle.org/user/tasks/list?c=${Date.now()}`;
                break;
            case 'one-time':
                url = `https://api.toncircle.org/user/tasks/one-time/list?c=${Date.now()}`;
                break;
            case 'partner':
                url = `https://api.toncircle.org/user/tasks/partner/list?c=${Date.now()}`;
                break;
            default:
                throw new Error('Invalid task type');
        }
        const headers = { ...this.headers, "Authorization": authorization };
        return this.makeRequest(url, 'get', null, headers, proxy);
    }

    async startTask(authorization, taskId, type = 'regular', proxy) {
        let url;
        switch(type) {
            case 'regular':
                url = `https://api.toncircle.org/user/tasks/start?c=${Date.now()}`;
                break;
            case 'one-time':
                url = `https://api.toncircle.org/user/tasks/one-time/start?c=${Date.now()}`;
                break;
            case 'partner':
                url = `https://api.toncircle.org/user/tasks/partner/start?c=${Date.now()}`;
                break;
            default:
                throw new Error('Invalid task type');
        }
        const headers = { ...this.headers, "Authorization": authorization };
        const payload = { id: taskId };
        return this.makeRequest(url, 'post', payload, headers, proxy);
    }

    async finalizeTask(authorization, taskId, type = 'regular', proxy) {
        let url;
        switch(type) {
            case 'regular':
                url = `https://api.toncircle.org/user/tasks/finalize?c=${Date.now()}`;
                break;
            case 'one-time':
                url = `https://api.toncircle.org/user/tasks/one-time/finalize?c=${Date.now()}`;
                break;
            case 'partner':
                url = `https://api.toncircle.org/user/tasks/partner/finalize?c=${Date.now()}`;
                break;
            default:
                throw new Error('Invalid task type');
        }
        const headers = { ...this.headers, "Authorization": authorization };
        const payload = { id: taskId };
        return this.makeRequest(url, 'post', payload, headers, proxy);
    }

    async processTasksOfType(authorization, type, proxy) {
        const tasksResult = await this.getTasksList(authorization, type, proxy);
        if (tasksResult.success) {
            const incompleteTasks = tasksResult.data.tasks.filter(task => !task.completed);
            for (const task of incompleteTasks) {
                const startResult = await this.startTask(authorization, task.id, type, proxy);
                if (startResult.success) {
                    const finalizeResult = await this.finalizeTask(authorization, task.id, type, proxy);
                    if (finalizeResult.success) {
                        this.log(`Làm nhiệm vụ ${task.data.title} (${type}) thành công | phần thưởng : ${task.reward}`, 'success');
                    } else {
                        this.log(`Làm nhiệm vụ ${task.data.title} (${type}) không thành công | Cần tự làm`, 'error');
                    }
                } else {
                    this.log(`Không thể bắt đầu nhiệm vụ ${task.data.title} (${type}): ${startResult.error}`, 'error');
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            this.log(`Không thể lấy danh sách nhiệm vụ ${type}: ${tasksResult.error}`, 'error');
        }
    }

    async spin(authorization, bet, chance, proxy) {
        const url = `https://api.toncircle.org/user/games/upgrade/spin?c=${Date.now()}`;
        const headers = { ...this.headers, "Authorization": authorization };
        const payload = { bet, chance };
        return this.makeRequest(url, 'post', payload, headers, proxy);
    }

    async main() {
        while (true) {
            const dataFile = path.join(__dirname, 'data.txt');
            const data = fs.readFileSync(dataFile, 'utf8')
                .replace(/\r/g, '')
                .split('\n')
                .filter(Boolean);

            for (let i = 0; i < data.length; i++) {
                const authorization = data[i];
                const proxy = this.proxies[i % this.proxies.length];
                let proxyIP = 'Unknown';

                try {
                    proxyIP = await this.checkProxyIP(proxy);
                } catch (error) {
                    this.log(`Không thể kiểm tra IP của proxy: ${error.message}`, 'warning');
                    continue;
                }

                const loginResult = await this.login(authorization, proxy);
                if (loginResult.success) {
                    const profileResult = await this.getProfile(authorization, proxy);
                    if (profileResult.success) {
                        const firstName = profileResult.data.firstName;
                        console.log(`========== Tài khoản ${i + 1} | ${firstName.green} | ip: ${proxyIP} ==========`);
                        this.log('Đăng nhập thành công!', 'success');
                        this.log(`Sparks Balance: ${profileResult.data.pointsBalance}`, 'custom');
                        this.log(`Circle Balance: ${profileResult.data.starsBalance}`, 'custom');

                        const bonusResult = await this.claimDailyBonus(authorization, proxy);
                        if (bonusResult.success) {
                            this.log(`Điểm danh thành công!`, 'success');
                        } else {
                            this.log(`Không thể nhận điểm danh hàng ngày: ${bonusResult.error}`, 'error');
                        }

                        await this.processTasksOfType(authorization, 'regular', proxy);
                        await this.processTasksOfType(authorization, 'one-time', proxy);
                        await this.processTasksOfType(authorization, 'partner', proxy);

                        const updatedProfileResult = await this.getProfile(authorization, proxy);
                        if (updatedProfileResult.success) {
                            this.log(`Sparks có sẵn để spin: ${updatedProfileResult.data.pointsBalance}`, 'custom');
                            if (updatedProfileResult.data.pointsBalance > 0) {
                                const spinResult = await this.spin(authorization, updatedProfileResult.data.pointsBalance, 100, proxy);
                                if (spinResult.success) {
                                    this.log(`Spin thành công, nhận ${spinResult.data.winAmount} Circles`, 'success');
                                } else {
                                    this.log(`Không thể thực hiện spin: ${spinResult.error}`, 'error');
                                }
                            }
                        } else {
                            this.log(`Không thể lấy thông tin tài khoản cập nhật: ${updatedProfileResult.error}`, 'error');
                        }

                    } else {
                        this.log(`Không thể lấy thông tin tài khoản: ${profileResult.error}`, 'error');
                    }
                } else {
                    this.log(`Đăng nhập không thành công! ${loginResult.error}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            this.log('Đã xử lý xong tất cả tài khoản. Nghỉ 24 giờ trước khi tiếp tục vòng lặp.', 'warning');
            await this.countdown(24 * 60 * 60); // số 24 là giờ
        }
    }
}

const client = new TonCircle();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});