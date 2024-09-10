const fs = require('fs');
const axios = require('axios');
const colors = require('colors');

class YesCoinBot {
    constructor() {
        this.accounts = this.loadAccounts('data.txt');
        this.tokens = this.loadTokens('token.json');
        this.cekTaskEnable = 'n';
        this.upgradeMultiEnable = 'n';
        this.upgradeFillEnable = 'n';
        this.maxLevel = 5;
    }

    loadAccounts(filePath) {
        return fs.readFileSync(filePath, 'utf-8').replace(/\r/g, '').split('\n').filter(Boolean);
    }

    loadTokens(filePath) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (error) {
            return {};
        }
    }

    headers(token) {
        return {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'content-type': 'application/json',
            'origin': 'https://www.yescoin.gold',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'referer': 'https://www.yescoin.gold/',
            'sec-ch-ua': '"Microsoft Edge";v="125", "Chromium";v="125", "Not.A/Brand";v="24", "Microsoft Edge WebView2";v="125"',
            'sec-Ch-Ua-Mobile': '?1',
            'sec-Ch-Ua-Platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'token': token,
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36'
        };
    }

    formatLoginPayload(encodedData) {
        const decodedData = decodeURIComponent(encodedData);
        return { code: decodedData };
    }

    async login(encodedData, accountIndex) {
        const url = 'https://api-backend.yescoin.gold/user/login';
        const formattedPayload = this.formatLoginPayload(encodedData);
        const headers = {
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://www.yescoin.gold',
            'referer': 'https://www.yescoin.gold/',
            'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128", "Microsoft Edge WebView2";v="128"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
        };

        try {
            const response = await axios.post(url, formattedPayload, { headers });
            if (response.data.code === 0) {
                const token = response.data.data.token;
                this.saveToken(accountIndex, token);
                return token;
            } else {
                throw new Error(`Đăng nhập thất bại: ${response.data.message}`);
            }
        } catch (error) {
            throw new Error(`Đăng nhập thất bại: ${error.message}`);
        }
    }

    saveToken(accountIndex, token) {
        this.tokens[accountIndex] = token;
        fs.writeFileSync('token.json', JSON.stringify(this.tokens, null, 2));
    }

    async getOrRefreshToken(encodedData, accountIndex) {
        let token = this.tokens[accountIndex];
        if (token) {
            return token;
        }
        token = await this.login(encodedData, accountIndex);
        return token;
    }

    async log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [*] ${msg}`.green);
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
        await this.randomDelay();
    }

    async randomDelay() {
        const delay = Math.floor(Math.random() * 300) + 300;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async collectCoin(token, amount) {
        const url = 'https://api.yescoin.gold/game/collectCoin';
        const headers = this.headers(token);
        try {
            const response = await axios.post(url, amount, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getAccountInfo(token) {
        try {
            const url = 'https://api.yescoin.gold/account/getAccountInfo';
            const headers = this.headers(token);
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getGameInfo(token) {
        try {
            const url = 'https://api.yescoin.gold/game/getGameInfo';
            const headers = this.headers(token);
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async useSpecialBox(token) {
        const url = 'https://api.yescoin.gold/game/recoverSpecialBox';
        const headers = this.headers(token);
        try {
            const response = await axios.post(url, {}, { headers });
            if (response.data.code === 0) {
                await this.log('Kích hoạt rương...', 'success');
                return true;
            } else {
                await this.log('Kích hoạt rương thất bại!', 'error');
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async getSpecialBoxInfo(token) {
        try {
            const url = 'https://api.yescoin.gold/game/getSpecialBoxInfo';
            const headers = this.headers(token);
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getuser(token) {
        try {
            const url = 'https://api.yescoin.gold/account/getRankingList?index=1&pageSize=1&rankType=1&userLevel=1';
            const headers = this.headers(token);
            const response = await axios.get(url, { headers });
            if (response.data.data.myUserNick) {
                return response.data.data.myUserNick;
            }
            return "no nickname";
        } catch (error) {
            return "no nickname";
        }
    }

    async collectFromSpecialBox(token, boxType, coinCount) {
        const url = 'https://api.yescoin.gold/game/collectSpecialBoxCoin';
        const headers = this.headers(token);
        const data = { boxType, coinCount };
        try {
            const response = await axios.post(url, data, { headers });
            if (response.data.code === 0) {
                if (response.data.data.collectStatus) {
                    await this.log(`Mở rương nhận được ${response.data.data.collectAmount} Coins`, 'success');
                    return { success: true, collectedAmount: response.data.data.collectAmount };
                } else {
                    await this.log('Không có rương!', 'warning');
                    return { success: true, collectedAmount: 0 };
                }
            } else {
                return { success: false, collectedAmount: 0 };
            }
        } catch (error) {
            return { success: false, collectedAmount: 0 };
        }
    }

    async attemptCollectSpecialBox(token, boxType, initialCoinCount) {
        let coinCount = initialCoinCount;
        while (coinCount > 0) {
            const result = await this.collectFromSpecialBox(token, boxType, coinCount);
            if (result.success) {
                return result.collectedAmount;
            }
            coinCount -= 20;
        }
        await this.log('Không thể thu thập rương!', 'error');
        return 0;
    }

    async getAccountBuildInfo(token) {
        try {
            const url = 'https://api.yescoin.gold/build/getAccountBuildInfo';
            const headers = this.headers(token);
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getSquadInfo(token) {
        const url = 'https://api.yescoin.gold/squad/mySquad';
        const headers = this.headers(token);
        try {
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async joinSquad(token, squadLink) {
        const url = 'https://api.yescoin.gold/squad/joinSquad';
        const headers = this.headers(token);
        const data = { squadTgLink: squadLink };
        try {
            const response = await axios.post(url, data, { headers });
            if (response.data.code === 0) {
                return response.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async recoverCoinPool(token) {
        const url = 'https://api.yescoin.gold/game/recoverCoinPool';
        const headers = this.headers(token);
        try {
            const response = await axios.post(url, {}, { headers });
            if (response.data.code === 0) {
                await this.log('Recovery thành công!', 'success');
                return true;
            } else {
                await this.log('Recovery thất bại!', 'error');
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    async getTaskList(token) {
        const url = 'https://api.yescoin.gold/task/getCommonTaskList';
        const headers = this.headers(token);
        try {
            const response = await axios.get(url, { headers });
            if (response.data.code === 0) {
                return response.data.data;
            } else {
                await this.log(`Không lấy được danh sách nhiệm vụ: ${response.data.message}`, 'error');
                return null;
            }
        } catch (error) {
            await this.log('Error: ' + error.message, 'error');
            return null;
        }
    }

    async finishTask(token, taskId) {
        const url = 'https://api.yescoin.gold/task/finishTask';
        const headers = this.headers(token);
        try {
            const response = await axios.post(url, taskId, { headers });
            if (response.data.code === 0) {
                await this.log(`Làm nhiệm vụ ${taskId} thành công | Phần thưởng: ${response.data.data.bonusAmount}`, 'success');
                return true;
            } else {
                await this.log(`Làm nhiệm vụ ${taskId} thất bại: ${response.data.message}`, 'error');
                return false;
            }
        } catch (error) {
            await this.log(`Lỗi khi làm nhiệm vụ: ${error.message}`, 'error');
            return false;
        }
    }

    async processTasks(token) {
        const tasks = await this.getTaskList(token);
        if (tasks) {
            for (const task of tasks) {
                if (task.taskStatus === 0) {
                    await this.finishTask(token, task.taskId);
                } else {
                    await this.log('Nhiệm vụ đã hoàn thành', 'info');
                }
            }
        }
    }

    async upgradeLevel(token, currentLevel, targetLevel, upgradeType) {
        const url = 'https://api.yescoin.gold/build/levelUp';
        const headers = this.headers(token);
        const upgradeTypeName = upgradeType === '1' ? 'Multi Value' : 'Fill Rate';

        while (currentLevel < targetLevel) {
            try {
                const response = await axios.post(url, upgradeType, { headers });
                if (response.data.code === 0) {
                    currentLevel++;
                    await this.log(`Nâng cấp ${upgradeTypeName} lên Lv ${currentLevel}`, 'success');
                } else {
                    await this.log(`Nâng cấp thất bại: ${response.data.message}`, 'error');
                    break;
                }
            } catch (error) {
                await this.log('Lỗi nâng cấp: ' + error.message, 'error');
                break;
            }
        }

        if (currentLevel === targetLevel) {
            await this.log(`${upgradeTypeName} đã ở cấp độ ${currentLevel}`, 'info');
        }
    }

    async wait(seconds) {
        for (let i = seconds; i > 0; i--) {
            process.stdout.write(`\r${colors.cyan(`[*] Chờ ${Math.floor(i / 60)} phút ${i % 60} giây để tiếp tục`)}`.padEnd(80));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log(`Bắt đầu vòng lặp mới...`);
    }

    quest() {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            readline.question("Bạn có muốn làm nhiệm vụ không? (y/n, mặc định n): ", (taskAnswer) => {
                this.cekTaskEnable = taskAnswer.toLowerCase() === 'y' ? 'y' : 'n';

                readline.question("Bạn có muốn nâng cấp multi không? (y/n, mặc định n): ", (multiAnswer) => {
                    this.upgradeMultiEnable = multiAnswer.toLowerCase() === 'y' ? 'y' : 'n';

                    readline.question("Bạn có muốn nâng cấp fill rate không? (y/n, mặc định n): ", (fillAnswer) => {
                        this.upgradeFillEnable = fillAnswer.toLowerCase() === 'y' ? 'y' : 'n';

                        if (this.upgradeMultiEnable === 'y' || this.upgradeFillEnable === 'y') {
                            readline.question("Nhập lv tối đa để nâng cấp (mặc định: 5): ", (maxLevelAnswer) => {
                                this.maxLevel = maxLevelAnswer ? parseInt(maxLevelAnswer) : 5;
                                readline.close();
                                resolve();
                            });
                        } else {
                            this.maxLevel = 5;
                            readline.close();
                            resolve();
                        }
                    });
                });
            });
        });
    }

    async handleSwipeBot(token) {
        const url = 'https://api.yescoin.gold/build/getAccountBuildInfo';
        try {
            const response = await axios.get(url, { headers: this.headers(token) });
            const accountBuildInfo = response.data;
            if (accountBuildInfo.code === 0) {
                const { swipeBotLevel, openSwipeBot } = accountBuildInfo.data;
                if (swipeBotLevel < 1) {
                    const upgradeUrl = 'https://api.yescoin.gold/build/levelUp';
                    const upgradeResponse = await axios.post(upgradeUrl, 4, { headers: this.headers(token) });
                    if (upgradeResponse.data.code === 0) {
                        await this.log('Mua SwipeBot thành công', 'success');
                    } else {
                        await this.log('Mua SwipeBot thất bại', 'error');
                    }
                }
                if (swipeBotLevel >= 1 && !openSwipeBot) {
                    const toggleUrl = 'https://api.yescoin.gold/build/toggleSwipeBotSwitch';
                    const toggleResponse = await axios.post(toggleUrl, true, { headers: this.headers(token) });
                    if (toggleResponse.data.code === 0) {
                        await this.log('Bật SwipeBot thành công', 'success');
                    } else {
                        await this.log('Bật SwipeBot thất bại', 'error');
                    }
                }
                if (swipeBotLevel >= 1 && openSwipeBot) {
                    const offlineBonusUrl = 'https://api.yescoin.gold/game/getOfflineYesPacBonusInfo';
                    const offlineBonusResponse = await axios.get(offlineBonusUrl, { headers: this.headers(token) });
                    const offlineBonusInfo = offlineBonusResponse.data;
                    if (offlineBonusInfo.code === 0 && offlineBonusInfo.data.length > 0) {
                        const claimUrl = 'https://api.yescoin.gold/game/claimOfflineBonus';
                        const claimData = {
                            id: offlineBonusInfo.data[0].transactionId,
                            createAt: Math.floor(Date.now() / 1000),
                            claimType: 1,
                            destination: ""
                        };
                        const claimResponse = await axios.post(claimUrl, claimData, { headers: this.headers(token) });
                        if (claimResponse.data.code === 0) {
                            await this.log(`Claim offline bonus thành công, nhận ${claimResponse.data.data.collectAmount} coins`, 'success');
                        } else {
                            await this.log('Claim offline bonus thất bại', 'error');
                        }
                    }
                }
            } else {
                await this.log('Không thể lấy thông tin SwipeBot', 'error');
            }
        } catch (error) {
            await this.log(`Lỗi xử lý SwipeBot: ${error.message}`, 'error');
        }
    }

    async main() {
        while (true) {
            for (let i = 0; i < this.accounts.length; i++) {
                const accountIndex = (i + 1).toString();
                const encodedData = this.accounts[i];
                let token;
                try {
                    token = await this.getOrRefreshToken(encodedData, accountIndex);
                } catch (error) {
                    await this.log(`Không thể lấy token cho tài khoản ${accountIndex}: ${error.message}`, 'error');
                    continue;
                }
                await this.randomDelay();
                const nickname = await this.getuser(token);
                await this.log(`========== Tài khoản ${accountIndex} | ${nickname} ==========`, 'info');
                
                await this.randomDelay();
                const squadInfo = await this.getSquadInfo(token);
                if (squadInfo && squadInfo.data.isJoinSquad) {
                    const squadTitle = squadInfo.data.squadInfo.squadTitle;
                    const squadMembers = squadInfo.data.squadInfo.squadMembers;
                    await this.log(`Bạn đã gia nhập ${squadTitle} | ${squadMembers} Thành viên`, 'info');
                } else {
                    await this.log('Squad: Bạn không ở trong Squad, gia nhập Dân Cày Airdrop.', 'warning');
                    await this.randomDelay();
                    const joinResult = await this.joinSquad(token, "t.me/dancayairdrop");
                    if (joinResult) {
                        await this.log(`Squad: ${nickname} gia nhập Squad thành công !`, 'success');
                    } else {
                        await this.log(`Squad: ${nickname} gia nhập Squad thất bại !`, 'error');
                    }
                }

                await this.randomDelay();
                const balance = await this.getAccountInfo(token);
                if (balance === null) {
                    await this.log('Balance: Không đọc được balance', 'error');
                    continue;
                } else {
                    const currentAmount = balance.data.currentAmount.toLocaleString().replace(/,/g, '.');
                    await this.log(`Balance: ${currentAmount}`, 'info');
                }

                await this.randomDelay();
                const gameInfo = await this.getAccountBuildInfo(token);
                if (gameInfo === null) {
                    await this.log('Không lấy được dữ liệu game!', 'error');
                    continue;
                } else {
                    const { specialBoxLeftRecoveryCount, coinPoolLeftRecoveryCount, singleCoinValue, singleCoinLevel, coinPoolRecoverySpeed, swipeBotLevel } = gameInfo.data;
                    await this.log(`Booster: Chest ${specialBoxLeftRecoveryCount} | Recovery ${coinPoolLeftRecoveryCount}`, 'info');
                    await this.log(`Multivalue: Level ${singleCoinValue}`, 'info');
                    await this.log(`Coin Limit: Level ${singleCoinLevel}`, 'info');
                    await this.log(`Fill Rate: Level ${coinPoolRecoverySpeed}`, 'info');
                    await this.log(`Swipe Bot: Level ${swipeBotLevel}`, 'info');
                }

                await this.randomDelay();
                await this.log('Kiểm tra và xử lý SwipeBot...', 'info');
                await this.handleSwipeBot(token);

                if (this.cekTaskEnable === 'y') {
                    await this.randomDelay();
                    await this.log('Bắt đầu làm nhiệm vụ...', 'info');
                    await this.processTasks(token);
                }

                if (this.upgradeMultiEnable === 'y') {
                    await this.randomDelay();
                    await this.log('Bắt đầu nâng cấp multi...', 'info');
                    await this.upgradeLevel(token, gameInfo.data.singleCoinValue, this.maxLevel, '1');
                }

                if (this.upgradeFillEnable === 'y') {
                    await this.randomDelay();
                    await this.log('Bắt đầu nâng cấp Fill Rate....', 'info');
                    await this.upgradeLevel(token, gameInfo.data.coinPoolRecoverySpeed, this.maxLevel, '2');
                }

                await this.randomDelay();
                const collectInfo = await this.getGameInfo(token);
                if (collectInfo === null) {
                    await this.log('Không lấy được dữ liệu game!', 'error');
                    continue;
                } else {
                    const { singleCoinValue, coinPoolLeftCount } = collectInfo.data;
                    await this.log(`Năng lượng còn lại ${coinPoolLeftCount}`, 'info');

                    if (coinPoolLeftCount > 0) {
                        await this.randomDelay();
                        const amount = Math.floor(coinPoolLeftCount / singleCoinValue);
                        const collectResult = await this.collectCoin(token, amount);
                        if (collectResult && collectResult.code === 0) {
                            const collectedAmount = collectResult.data.collectAmount;
                            await this.log(`Tap thành công, nhận được ${collectedAmount} coins`, 'success');
                        } else {
                            await this.log('Tap không thành công!', 'error');
                        }
                    }
                }

                await this.randomDelay();
                await this.log('Kiếm tra số lượng rương còn lại...', 'info');
                if (gameInfo && gameInfo.data.specialBoxLeftRecoveryCount > 0) {
                    if (await this.useSpecialBox(token)) {
                        await this.randomDelay();
                        await this.log('Bắt đầu thu thập...', 'info');
                        const collectedAmount = await this.attemptCollectSpecialBox(token, 2, 240);
                    }
                } else {
                    await this.log('Không có rương nào!', 'warning');
                }

                await this.randomDelay();
                await this.log('Bắt đầu recovery...', 'info');
                const updatedGameInfo = await this.getAccountBuildInfo(token);
                if (updatedGameInfo && updatedGameInfo.data.coinPoolLeftRecoveryCount > 0) {
                    if (await this.recoverCoinPool(token)) {
                        await this.randomDelay();
                        const updatedCollectInfo = await this.getGameInfo(token);
                        if (updatedCollectInfo) {
                            const { coinPoolLeftCount, singleCoinValue } = updatedCollectInfo.data;
                            if (coinPoolLeftCount > 0) {
                                await this.randomDelay();
                                const amount = Math.floor(coinPoolLeftCount / singleCoinValue);
                                const collectResult = await this.collectCoin(token, amount);
                                if (collectResult && collectResult.code === 0) {
                                    const collectedAmount = collectResult.data.collectAmount;
                                    await this.log(`Tap thành công, nhận được ${collectedAmount} coins`, 'success');
                                } else {
                                    await this.log('Tap không thành công!', 'error');
                                }
                            }
                        }
                    }
                } else {
                    await this.log('Đã dùng hết recovery!', 'warning');
                }

                await this.randomDelay();
                await this.log('Kiểm tra rương miễn phí xuất hiện...', 'info');
                const freeChestCollectedAmount = await this.attemptCollectSpecialBox(token, 1, 200);
            }

            await this.wait(2 * 60);
        }
    }
}

const bot = new YesCoinBot();
bot.quest().then(() => {
    bot.main();
});