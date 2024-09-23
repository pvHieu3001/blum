const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { HttpsProxyAgent } = require('https-proxy-agent');

class Tsubasa {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://app.ton.tsubasa-rivals.com",
            "Referer": "https://app.ton.tsubasa-rivals.com/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
        this.config = this.loadConfig();
        this.proxies = this.loadProxies();
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

    loadConfig() {
        const configPath = path.join(__dirname, 'config.json');
        try {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        } catch (error) {
            console.error("Không đọc được config:", error.message);
            return {
                enableCardUpgrades: true,
                maxUpgradeCost: 1000000,
                upgradeIntervalMinutes: 60
            };
        }
    }

    loadProxies() {
        const proxyPath = path.join(__dirname, 'proxy.txt');
        try {
            return fs.readFileSync(proxyPath, 'utf8').split('\n').filter(Boolean);
        } catch (error) {
            console.error("Không đọc được proxy:", error.message);
            return [];
        }
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

    async countdown(seconds) {
        for (let i = seconds; i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async callStartAPI(initData, axiosInstance) {
        const startUrl = "https://app.ton.tsubasa-rivals.com/api/start";
        const startPayload = { lang_code: "en", initData: initData };
        
        try {
            const startResponse = await axiosInstance.post(startUrl, startPayload);
            if (startResponse.status === 200 && startResponse.data && startResponse.data.game_data) {
                const { total_coins, energy, max_energy, coins_per_tap, profit_per_second } = startResponse.data.game_data.user || {};
                const masterHash = startResponse.data.master_hash;
                if (masterHash) {
                    this.headers['X-Masterhash'] = masterHash;
                }
                
                const tasks = startResponse.data.task_info 
                ? startResponse.data.task_info.filter(task => task.status === 0 || task.status === 1)
                : [];
                
                return { 
                    total_coins, 
                    energy, 
                    max_energy, 
                    coins_per_tap, 
                    profit_per_second, 
                    tasks,
                    success: true 
                };
            } else {
                return { success: false, error: `Lỗi gọi api start` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi gọi api start: ${error.message}` };
        }
    }

    async callTapAPI(initData, tapCount, axiosInstance) {
        const tapUrl = "https://app.ton.tsubasa-rivals.com/api/tap";
        const tapPayload = { tapCount: tapCount, initData: initData };
        
        try {
            const tapResponse = await axiosInstance.post(tapUrl, tapPayload);
            if (tapResponse.status === 200) {
                const { total_coins, energy, max_energy, coins_per_tap, profit_per_second } = tapResponse.data.game_data.user;
                return { total_coins, energy, max_energy, coins_per_tap, profit_per_second, success: true };
            } else {
                return { success: false, error: `Lỗi tap: ${tapResponse.status}` };
            }
        } catch (error) {
            return { success: false, error: `Lỗi tap: ${error.message}` };
        }
    }

    async callDailyRewardAPI(initData, axiosInstance) {
        const dailyRewardUrl = "https://app.ton.tsubasa-rivals.com/api/daily_reward/claim";
        const dailyRewardPayload = { initData: initData };
        
        try {
            const dailyRewardResponse = await axiosInstance.post(dailyRewardUrl, dailyRewardPayload);
            if (dailyRewardResponse.status === 200) {
                return { success: true, message: "Điểm danh hàng ngày thành công" };
            } else {
                return { success: false, message: "Hôm nay bạn đã điểm danh rồi" };
            }
        } catch (error) {
            if (error.response && error.response.status === 400) {
                return { success: false, message: "Hôm nay bạn đã điểm danh rồi" };
            }
            return { success: false, message: `Lỗi điểm danh hàng ngày: ${error.message}` };
        }
    }

    async executeTask(initData, taskId, axiosInstance) {
        const executeUrl = "https://app.ton.tsubasa-rivals.com/api/task/execute";
        const executePayload = { task_id: taskId, initData: initData };
        
        try {
            const executeResponse = await axiosInstance.post(executeUrl, executePayload);
            return executeResponse.status === 200;
        } catch (error) {
            this.log(`Lỗi khi làm nhiệm vụ ${taskId}: ${error.message}`);
            return false;
        }
    }

    async checkTaskAchievement(initData, taskId, axiosInstance) {
        const achievementUrl = "https://app.ton.tsubasa-rivals.com/api/task/achievement";
        const achievementPayload = { task_id: taskId, initData: initData };
        
        try {
            const achievementResponse = await axiosInstance.post(achievementUrl, achievementPayload);
            if (achievementResponse.status === 200) {
                if (achievementResponse.data && achievementResponse.data && achievementResponse.data.task_info) {
                    const updatedTask = achievementResponse.data.task_info.find(task => task.id === taskId);
                    if (updatedTask && updatedTask.status === 2) {
                        return { success: true, title: updatedTask.title, reward: updatedTask.reward };
                    }
                }
            }
            return { success: false };
        } catch (error) {
            this.log(`Lỗi rồi ${taskId}: ${error.message}`);
            return { success: false };
        }
    }

    async getCardInfo(initData, axiosInstance) {
        const startUrl = "https://app.ton.tsubasa-rivals.com/api/start";
        const startPayload = { lang_code: "en", initData: initData };
        
        try {
            const startResponse = await axiosInstance.post(startUrl, startPayload);
            if (startResponse.status === 200 && startResponse.data && startResponse.data.card_info) {
                const cardInfo = startResponse.data.card_info.flatMap(category => {
                    return category.card_list.map(card => ({
                        categoryId: card.category,
                        cardId: card.id,
                        level: card.level,
                        cost: card.cost,
                        unlocked: card.unlocked,
                        name: card.name,
                        profitPerHour: card.profit_per_hour,
                        nextProfitPerHour: card.next_profit_per_hour
                    }));
                });
                return cardInfo;
            } else {
                console.log("Không tìm thấy thông tin thẻ!");
                return null;
            }
        } catch (error) {
            console.log(`Lỗi lấy thông tin thẻ: ${error.message}`);
            return null;
        }
    }

    async levelUpCards(initData, totalCoins, axiosInstance) {
        if (!this.config.enableCardUpgrades) {
            console.log("Nâng cấp thẻ bị vô hiệu hóa trong config.");
            return totalCoins;
        }

        let updatedTotalCoins = totalCoins;
        let leveledUp = false;

        do {
            leveledUp = false;
            const cardInfo = await this.getCardInfo(initData, axiosInstance);
            if (!cardInfo) {
                console.log("Không lấy được thông tin thẻ. Hủy nâng cấp thẻ!");
                break;
            }

            for (const card of cardInfo) {
                if (card.unlocked && updatedTotalCoins >= card.cost && card.cost <= this.config.maxUpgradeCost) {
                    const levelUpUrl = "https://app.ton.tsubasa-rivals.com/api/card/levelup";
                    const levelUpPayload = {
                        category_id: card.categoryId,
                        card_id: card.cardId,
                        initData: initData
                    };

                    try {
                        const levelUpResponse = await axiosInstance.post(levelUpUrl, levelUpPayload);
                        if (levelUpResponse.status === 200) {
                            updatedTotalCoins -= card.cost;
                            leveledUp = true;
                            this.log(`Nâng cấp thẻ ${card.name} (${card.cardId}) lên level ${card.level + 1}. Cost: ${card.cost}, Balance còn: ${updatedTotalCoins}`);
                        }
                    } catch (error) {
                        console.log(`Lỗi nâng cấp thẻ ${card.name} (${card.cardId}): ${error.message}`);
                    }
                }
            }
        } while (leveledUp);

        return updatedTotalCoins;
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        let lastUpgradeTime = 0;

        while (true) {
            for (let i = 0; i < data.length; i++) {
                const initData = data[i];
                const firstName = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0])).first_name;
                const proxy = this.proxies[i] || '';

                let proxyIP = 'N/A';
                try {
                    if (proxy) {
                        proxyIP = await this.checkProxyIP(proxy);
                    }
                } catch (error) {
                    this.log(`Lỗi kiểm tra IP proxy: ${error.message}`, 'warning');
                    continue;
                }
                
                this.log(`========== Tài khoản ${i + 1} | ${firstName} | ip: ${proxyIP} ==========`, 'custom');

                const axiosInstance = axios.create({
                    httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined,
                    headers: this.headers
                });

                try {
                    const startResult = await this.callStartAPI(initData, axiosInstance);
                    if (startResult.success) {
                        if (startResult.total_coins !== undefined) {
                            this.log(`Balance: ${startResult.total_coins}`);
                            this.log(`Năng lượng: ${startResult.energy}/${startResult.max_energy}`);
                            this.log(`Coins per tap: ${startResult.coins_per_tap}`);
                            this.log(`Lợi nhuận mỗi giây: ${startResult.profit_per_second}`);
                        }

                        if (startResult.tasks && startResult.tasks.length > 0) {
                            for (const task of startResult.tasks) {
                                const executeResult = await this.executeTask(initData, task.id, axiosInstance);
                                if (executeResult) {
                                    const achievementResult = await this.checkTaskAchievement(initData, task.id, axiosInstance);
                                    if (achievementResult.success) {
                                        this.log(`Làm nhiệm vụ ${achievementResult.title} thành công | phần thưởng ${achievementResult.reward}`, 'success');
                                    }
                                }
                            }
                        } else {
                            this.log(`Không có nhiệm vụ nào khả dụng.`, 'warning');
                        }

                        if (startResult.energy !== undefined) {
                            const tapResult = await this.callTapAPI(initData, startResult.energy, axiosInstance);
                            if (tapResult.success) {
                                this.log(`Tap thành công | Năng lượng còn ${tapResult.energy}/${tapResult.max_energy} | Balance : ${tapResult.total_coins}`, 'success');
                            } else {
                                this.log(tapResult.error, 'error');
                            }
                        }

                        const dailyRewardResult = await this.callDailyRewardAPI(initData, axiosInstance);
                        this.log(dailyRewardResult.message, dailyRewardResult.success ? 'success' : 'warning');

                        const currentTime = Date.now();
                        if (currentTime - lastUpgradeTime >= this.config.upgradeIntervalMinutes * 60 * 1000) {
                            const updatedTotalCoins = await this.levelUpCards(initData, startResult.total_coins, axiosInstance);
                            this.log(`Đã nâng cấp hết các thẻ đủ điều kiện | Balance: ${updatedTotalCoins}`, 'success');
                            lastUpgradeTime = currentTime;
                        } else {
                            this.log(`Bỏ qua nâng cấp thẻ. Nâng cấp tiếp theo sau ${Math.round((this.config.upgradeIntervalMinutes * 60 * 1000 - (currentTime - lastUpgradeTime)) / 60000)} phút.`, 'info');
                        }
                    } else {
                        this.log(startResult.error, 'error');
                    }
                } catch (error) {
                    this.log(`Lỗi xử lý tài khoản ${i + 1}: ${error.message}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(60);
        }
    }
}

const client = new Tsubasa();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});