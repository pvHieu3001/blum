const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const querystring = require('querystring');

class MhayaAPIClient {
    constructor() {
        this.headers = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json; charset=UTF-8",
            "Language": "en",
            "Origin": "https://mhaya.info",
            "Referer": "https://mhaya.info/?parentId=28ABuTHTiKX",
            "Sec-Ch-Ua": '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36"
        };
        this.usdtFile = path.join(__dirname, 'usdt.txt');
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
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.log('', 'info');
    }

    async auth(openid) {
        const url = "https://mhaya.info/api/auth";
        const payload = {
            pid: 2,
            openid: openid,
            channel: "tg",
            platform: "android"
        };

        try {
            const response = await axios.post(url, payload, { headers: this.headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, token: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async login(token, nickName) {
        const url = "https://mhaya.info/api/login";
        const headers = { ...this.headers, "Token": token };
        const payload = { nickName: nickName };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async invite(token) {
        const url = "https://mhaya.info/api/invite";
        const headers = { ...this.headers, "Token": token };
        const payload = { parentName: "28ABuTHTiKX" };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async start(token, username, usernamemaybe, nickname) {
        const url = "https://mhaya.info/api/start";
        const headers = { 
            ...this.headers, 
            "Token": token,
            "Content-Type": "application/x-www-form-urlencoded"
        };
        const payload = querystring.stringify({
            username: username,
            usernamemaybe: usernamemaybe,
            nickname: nickname
        });

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async guide(token) {
        const url = "https://mhaya.info/api/guide";
        const headers = { ...this.headers, "Token": token };
        const payload = { close: 1, closeReward: 1 };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    printItems(items) {
        this.log(`Score: ${items['5'].num}`);
        this.log(`Roll: ${items['1'].num}/${items['1'].maxNum}`);
        this.log(`USDT: ${items['3'].num / 10000000}`);
        this.log(`TON: ${items['4'].num}`);
        this.log(`Draws Number: ${items['7'].num}`);
    }

    async lottery(token, tp) {
        const url = "https://mhaya.info/api/lottery";
        const headers = { ...this.headers, "Token": token };
        const payload = { tp };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    processDraw(drawData) {
        const usdtTotal = drawData.draws.reduce((sum, draw) => draw.itemId === 3 ? sum + draw.num : sum, 0);
        const tonTotal = drawData.draws.reduce((sum, draw) => draw.itemId === 4 ? sum + draw.num : sum, 0);
        const scoreTotal = drawData.draws.reduce((sum, draw) => draw.itemId === 5 ? sum + draw.num : sum, 0);
        return { usdtTotal, tonTotal, scoreTotal };
    }

    async handleLottery(token, totalTickets) {
        let usdtGrandTotal = 0;
        let tonGrandTotal = 0;
        let scoreGrandTotal = 0;

        while (totalTickets > 0) {
            const tp = totalTickets >= 10 ? 2 : 1;
            const ticketsUsed = tp === 2 ? 10 : 1;

            const lotteryResult = await this.lottery(token, tp);
            if (lotteryResult.success) {
                const { usdtTotal, tonTotal, scoreTotal } = this.processDraw(lotteryResult.data);
                usdtGrandTotal += usdtTotal;
                tonGrandTotal += tonTotal;
                scoreGrandTotal += scoreTotal;

                this.log(`Used ${ticketsUsed} tickets. USDT: ${usdtTotal / 10000000}, TON: ${tonTotal}, Score: ${scoreTotal}`, 'success');
            } else {
                this.log(`Lottery API call failed: ${lotteryResult.error}`, 'error');
                break;
            }

            totalTickets -= ticketsUsed;
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }

        this.log(`Total results - USDT: ${usdtGrandTotal / 10000000}, TON: ${tonGrandTotal}, Score: ${scoreGrandTotal}`, 'success');

        if (usdtGrandTotal / 10000000 >= 0.1 || tonGrandTotal > 0) {
            await this.writeUsdtToFile(this.currentAccountNumber, this.currentNickName, usdtGrandTotal / 10000000, tonGrandTotal);
        }
    }

    getRollThreshold(remainder) {
        const thresholds = [50, 30, 20, 10, 5, 3, 2, 1];
        return thresholds.find(threshold => remainder >= threshold) || 0;
    }

    async roll(token, multi) {
        const url = "https://mhaya.info/api/roll";
        const headers = { ...this.headers, "Token": token };
        const payload = { multi };

        try {
            const response = await axios.post(url, payload, { headers });
            if (response.status === 200 && response.data.code === 0) {
                return { success: true, data: response.data.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async handleRoll(token, rollCount) {
        let totalScore = 0;
        let remainingRolls = rollCount;

        while (remainingRolls > 0) {
            const multi = this.getRollThreshold(remainingRolls);
            if (multi === 0) break;

            const rollResult = await this.roll(token, multi);
            if (rollResult.success) {
                const score = rollResult.data.rolls.reduce((sum, roll) => sum + roll.score, 0);
                totalScore += score;
                remainingRolls -= multi;
                this.log(`Roll ${multi} lần thành công | Score: ${score}`, 'success');
            } else {
                this.log(`Roll API call failed: ${rollResult.error}`, 'error');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.log(`Tổng Score từ Roll: ${totalScore}`, 'success');
    }

    async writeUsdtToFile(accountNumber, nickName, usdtAmount, tonAmount) {
        const content = `Account ${accountNumber}: ${nickName} - USDT: ${usdtAmount.toFixed(7)} | TON: ${tonAmount}\n`;
        
        try {
            let existingContent = '';
            if (fs.existsSync(this.usdtFile)) {
                existingContent = fs.readFileSync(this.usdtFile, 'utf8');
            }

            const lines = existingContent.split('\n');
            const accountLine = lines.findIndex(line => line.startsWith(`Account ${accountNumber}:`));

            if (accountLine !== -1) {
                lines[accountLine] = content.trim();
            } else {
                lines.push(content.trim());
            }

            fs.writeFileSync(this.usdtFile, lines.join('\n'));
            this.log(`USDT/TON đạt ngưỡng cho phép rút tài khoản ${accountNumber}, đã lưu vào file usdt.txt`, 'success');
        } catch (error) {
            this.log(`Lỗi ghi thông tin USDT/TON vào tệp: ${error.message}`, 'error');
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
                const initData = data[i];
                const userData = JSON.parse(decodeURIComponent(initData.split('user=')[1].split('&')[0]));
                const openid = userData.id.toString();
                const nickName = userData.first_name + (userData.last_name ? ` ${userData.last_name}` : '');
                const username = userData.id;
                const usernamemaybe = userData.username || '';
                this.currentAccountNumber = i + 1;
                this.currentNickName = nickName;

                console.log(`========== Tài khoản ${i + 1} | ${nickName.green} ==========`);
                
                this.log(`Đang xác thực tài khoản ${openid}...`, 'info');
                const authResult = await this.auth(openid);
                if (!authResult.success) {
                    this.log(`Xác thực không thành công: ${authResult.error}`, 'error');
                    continue;
                }
                this.log('Xác thực thành công!', 'success');
                const token = authResult.token;

                this.log(`Đang đăng nhập với nickname: ${nickName}...`, 'info');
                const loginResult = await this.login(token, nickName);
                if (!loginResult.success) {
                    this.log(`Đăng nhập không thành công: ${loginResult.error}`, 'error');
                    continue;
                }
                this.log('Đăng nhập thành công!', 'success');

                await this.invite(token);

                let startResult = await this.start(token, username, usernamemaybe, nickName);
                if (!startResult.success) {
                    this.log(`Lỗi khi gửi yêu cầu start: ${startResult.error}`, 'error');
                    continue;
                }

                let { guide, firstReward, item } = startResult.data;
                if (guide >= 1 && firstReward >= 1) {
                    this.log('Đang gửi yêu cầu guide...', 'info');
                    await this.guide(token);
                    
                    startResult = await this.start(token, username, usernamemaybe, nickName);
                    if (startResult.success) {
                        item = startResult.data.item;
                    } else {
                        this.log(`Lỗi khi cập nhật thông tin sau guide: ${startResult.error}`, 'error');
                    }
                }

                this.printItems(item);

                const usdtAmount = item['3'].num / 10000000;
                if (usdtAmount >= 1) {
                    await this.writeUsdtToFile(i + 1, nickName, usdtAmount);
                }

                const rollCount = item['1'].num;
                if (rollCount > 0) {
                    this.log(`Số lần roll hiện có: ${rollCount}`, 'info');
                    await this.handleRoll(token, rollCount);
                } else {
                    this.log('Không có lần roll nào để sử dụng.', 'warning');
                }
                const drawsNumber = item['7'].num;
                if (drawsNumber > 0) {
                    this.log(`Số vé hiện có: ${drawsNumber}`, 'info');
                    await this.handleLottery(token, drawsNumber);
                } else {
                    this.log('Không có vé để sử dụng.', 'warning');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(360 * 60);
        }
    }
}

const client = new MhayaAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});