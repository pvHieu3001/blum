const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Vana {
    constructor() {
        this.proxies = this.loadProxies();
    }

    loadProxies() {
        const proxyFile = path.join(__dirname, 'proxy.txt');
        return fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    }

    getProxyAgent(proxy) {
        return new HttpsProxyAgent(proxy);
    }

    headers(initData) {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "X-Telegram-Web-App-Init-Data": initData
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`[*] Cần chờ ${i} giây để tiếp tục...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = this.getProxyAgent(proxy);
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

    async getPlayerData(initData, proxy) {
        const url = 'https://www.vanadatahero.com/api/player';
        const headers = this.headers(initData);
        const agent = this.getProxyAgent(proxy);
        try {
            const response = await axios.get(url, { headers, httpsAgent: agent });
            return response.data;
        } catch (error) {
            this.log(`${'Lỗi khi lấy thông tin người dùng'.red}`);
        }
    }

    async postTaskCompletion(initData, taskId, points, proxy) {
        const url = `https://www.vanadatahero.com/api/tasks/${taskId}`;
        const headers = this.headers(initData);
        const payload = {
            status: "completed",
            points: parseFloat(points)
        };
        const agent = this.getProxyAgent(proxy);

        try {
            const response = await axios.post(url, payload, { headers, httpsAgent: agent });
            if (response.data && response.data.message === 'Points limit exceeded') {
                this.log(`${'Đã vượt quá giới hạn điểm ngày hôm nay!'.red}`);
                return false;
            }
            return true;
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message === 'Points limit exceeded') {
                this.log(`${'Đã vượt quá giới hạn điểm ngày hôm nay!'.red}`);
                return false;
            }
            this.log(`${'Lỗi khi tap'.red}`);
            return false;
        }
    }

    async getTasks(initData, proxy) {
        const url = 'https://www.vanadatahero.com/api/tasks';
        const headers = this.headers(initData);
        const agent = this.getProxyAgent(proxy);
        try {
            const response = await axios.get(url, { headers, httpsAgent: agent });
            return response.data.tasks;
        } catch (error) {
            this.log(`${'Lỗi khi lấy danh sách nhiệm vụ'.red}`);
        }
    }

    async completePendingTasks(initData, proxy) {
        const tasks = await this.getTasks(initData, proxy);
        const excludeIds = [2, 17, 5, 9];
    
        for (const task of tasks) {
            if (task.completed.length === 0 && !excludeIds.includes(task.id)) { 
                const success = await this.postTaskCompletion(initData, task.id, task.points, proxy);
                if (success) {
                    this.log(`${`Làm nhiệm vụ`.green} ${task.name.yellow} ${`thành công | phần thưởng :`.green} ${task.points}`);
                } else {
                    continue;
                }
            }
        }
    }

    async processAccount(initData, hoinhiemvu, proxy, accountIndex) {
        try {
            const ip = await this.checkProxyIP(proxy).catch(error => {
                this.log(`${'Lỗi proxy'.red}: ${error.message}`);
                return null;
            });

            if (!ip) {
                return;
            }

            const playerData = await this.getPlayerData(initData, proxy);

            if (playerData) {
                console.log(`========== Tài khoản ${accountIndex} | ${playerData.tgFirstName.green} | IP: ${ip} ==========`);
                this.log(`${'Points:'.green} ${playerData.points.toString().white}`);
                this.log(`${'Multiplier:'.green} ${playerData.multiplier.toString().white}`);
            } else {
                this.log(`${'Lỗi: Không tìm thấy dữ liệu người dùng'.red}`);
            }

            while (true) {
                const taskCompleted = await this.postTaskCompletion(initData, 1, (Math.random() * (2000.0 - 1000.0) + 1000.0).toFixed(1), proxy);

                if (!taskCompleted) {
                    break;
                }

                const updatedPlayerData = await this.getPlayerData(initData, proxy);

                if (updatedPlayerData) {
                    this.log(`${'Tap thành công. Balance hiện tại:'.green} ${updatedPlayerData.points.toString().white}`);
                } else {
                    this.log(`${'Lỗi: Không tìm thấy dữ liệu người dùng sau khi tap'.red}`);
                }

                await new Promise(resolve => setTimeout(resolve, 1000)); 
            }
            if (hoinhiemvu) {
                await this.completePendingTasks(initData, proxy);
            }

        } catch (error) {
            this.log(`${'Lỗi khi xử lý tài khoản'.red}`);
            console.error(error);
        }
    }

    async askQuestion(question) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise(resolve => rl.question(question, answer => {
            rl.close();
            resolve(answer);
        }));
    }

    async main() {
        console.log(`Nếu gặp lỗi thì lấy lại query_id nhé!`.green);
        const nhiemvu = await this.askQuestion('Bạn có muốn làm nhiệm vụ không? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';
        const dataFile = path.join(__dirname, 'data.txt');
        const initDataList = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        for (let i = 0; i < initDataList.length; i++) {
            const initData = initDataList[i];
            const proxy = this.proxies[i];

            await this.processAccount(initData, hoinhiemvu, proxy, i + 1);
            await this.waitWithCountdown(3);
        }
        await this.waitWithCountdown(86400);
    }
}

if (require.main === module) {
    const vana = new Vana();
    vana.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}