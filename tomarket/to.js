const fs = require('fs');
const axios = require('axios');
const readline = require('readline');
const colors = require('colors');
const { parse } = require('querystring');
const { DateTime } = require('luxon');
const path = require('path');

class Tomarket {
    constructor() {
        this.headers = {
            'host': 'api-web.tomarket.ai',
            'connection': 'keep-alive',
            'accept': 'application/json, text/plain, */*',
            'user-agent': "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            'content-type': 'application/json',
            'origin': 'https://mini-app.tomarket.ai',
            'x-requested-with': 'tw.nekomimi.nekogram',
            'sec-fetch-site': 'same-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://mini-app.tomarket.ai/',
            'accept-language': 'en-US,en;q=0.9'
        };

        this.interval = 3;
        this.playGame = true;
        this.gameLowPoint = 300;
        this.gameHighPoint = 450;
    }

    setAuthorization(auth) {
        this.headers['authorization'] = auth;
    }

    delAuthorization() {
        delete this.headers['authorization'];
    }

    async login(data) {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/user/login';
        const cleanedData = data.replace(/\r/g, '');
        const requestData = {
            init_data: cleanedData,
            invite_code: ''
        };
        
        this.delAuthorization();
        try {
            const res = await this.http(url, this.headers, JSON.stringify(requestData));
            if (res.status !== 200) {
                this.log(colors.red(`Login không thành công! Mã trạng thái: ${res.status}`));
                return null;
            }
            const token = res.data.data.access_token;
            this.log(colors.green(`Đăng nhập thành công!`));
            return token;
        } catch (error) {
            this.log(colors.red(`Lỗi trong quá trình đăng nhập: ${error.message}`));
            return null;
        }
    }

    async startFarming() {
        const data = JSON.stringify({ game_id: '53b22103-c7ff-413d-bc63-20f6fb806a07' });
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/farm/start';
        const res = await this.http(url, this.headers, data);
        if (res.status !== 200) {
            this.log(colors.red('Không thể bắt đầu farming!'));
            return false;
        }
        const endFarming = res.data.data.end_at;
        const formatEndFarming = DateTime.fromMillis(endFarming).toISO().split('.')[0];
        this.log(colors.green('Bắt đầu farming...'));
    }

    async endFarming() {
        const data = JSON.stringify({ game_id: '53b22103-c7ff-413d-bc63-20f6fb806a07' });
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/farm/claim';
        const res = await this.http(url, this.headers, data);
        if (res.status !== 200) {
            this.log(colors.red('Không thể thu hoạch cà chua!'));
            return false;
        }
        const poin = res.data.data.claim_this_time;
        this.log(colors.green('Đã thu hoạch cà chua'));
        this.log(colors.green('Phần thưởng : ') + colors.white(poin));
    }

    async dailyClaim() {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/daily/claim';
        const data = JSON.stringify({ game_id: 'fa873d13-d831-4d6f-8aee-9cff7a1d0db1' });
        const res = await this.http(url, this.headers, data);
        if (res.status !== 200) {
            this.log(colors.red('Không thể điểm danh hàng ngày!'));
            return false;
        }

        const responseData = res.data.data;
        if (typeof responseData === 'string') {
            return false;
        }

        const poin = responseData.today_points;
        this.log(colors.green('Điểm danh hàng ngày thành công, phần thưởng: ') + colors.white(poin));
        return true;
    }

    async playGameFunc(amountPass) {
        const dataGame = JSON.stringify({ game_id: '59bcd12e-04e2-404c-a172-311a0084587d' });
        const startUrl = 'https://api-web.tomarket.ai/tomarket-game/v1/game/play';
        const claimUrl = 'https://api-web.tomarket.ai/tomarket-game/v1/game/claim';
        for (let i = 0; i < amountPass; i++) {
            const res = await this.http(startUrl, this.headers, dataGame);
            if (res.status !== 200) {
                this.log(colors.red('Không thể bắt đầu trò chơi'));
                return;
            }
            this.log(colors.green('Bắt đầu chơi game...'));
            await this.countdown(30);
            const point = this.randomInt(this.gameLowPoint, this.gameHighPoint);
            const dataClaim = JSON.stringify({ game_id: '59bcd12e-04e2-404c-a172-311a0084587d', points: point });
            const resClaim = await this.http(claimUrl, this.headers, dataClaim);
            if (resClaim.status !== 200) {
                this.log(colors.red('Lỗi nhận cà chua trong trò chơi'));
                continue;
            }
            this.log(colors.green('Nhận được cà chua : ') + colors.white(point));
        }
    }

    async getBalance() {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/user/balance';
        while (true) {
            const res = await this.http(url, this.headers, '{}');
            const data = res.data.data;
            if (!data) {
                this.log(colors.red('Lấy dữ liệu thất bại'));
                return null;
            }

            const timestamp = data.timestamp;
            const balance = data.available_balance;
            this.log(colors.green('Balance : ') + colors.white(balance));

            if (!data.daily) {
                await this.dailyClaim();
                continue;
            }

            const lastCheckTs = data.daily.last_check_ts;
            if (DateTime.now().toSeconds() > lastCheckTs + 24 * 60 * 60) {
                await this.dailyClaim();
            }

            if (!data.farming) {
                this.log(colors.yellow('Farming chưa bắt đầu'));
                await this.startFarming();
                continue;
            }

            const endFarming = data.farming.end_at;
            const formatEndFarming = DateTime.fromMillis(endFarming * 1000).toISO().split('.')[0];
            if (timestamp > endFarming) {
                await this.endFarming();
                continue;
            }

            this.log(colors.yellow('Thời gian hoàn thành farming: ') + colors.white(formatEndFarming));

            if (this.playGame) {
                const playPass = data.play_passes;
                this.log(colors.green('Vé trò chơi: ') + colors.white(playPass));
                if (parseInt(playPass) > 0) {
                    await this.playGameFunc(playPass);
                    continue;
                }
            }

            const next = endFarming - timestamp;
            return next;
        }
    }

    loadData(file) {
        const datas = fs.readFileSync(file, 'utf8').split('\n');
        if (datas.length <= 0) {
            console.log(colors.red(`Không tìm thấy dữ liệu`));
            process.exit();
        }
        return datas;
    }

    save(id, token) {
        const tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'));
        tokens[id] = token;
        fs.writeFileSync('token.json', JSON.stringify(tokens, null, 4));
    }

    get(id) {
        const tokens = JSON.parse(fs.readFileSync('token.json', 'utf8'));
        return tokens[id] || null;
    }

    isExpired(token) {
        const [header, payload, sign] = token.split('.');
        const decodedPayload = Buffer.from(payload, 'base64').toString();
        const parsedPayload = JSON.parse(decodedPayload);
        const now = Math.floor(DateTime.now().toSeconds());
        return now > parsedPayload.exp;
    }

    async http(url, headers, data = null) {
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const now = DateTime.now().toISO().split('.')[0];
                let res;
                if (!data) {
                    res = await axios.get(url, { headers });
                } else if (data === '') {
                    res = await axios.post(url, null, { headers });
                } else {
                    res = await axios.post(url, data, { headers });
                }
                return res;
            } catch (error) {
                console.log(error);
                console.log(colors.red('Lỗi kết nối'));
                retryCount++;
                if (retryCount < maxRetries) {
                    await this.countdown(1);
                } else {
                    throw new Error('Kết nối thất bại sau 3 lần thử');
                }
            }
        }
    }

    async countdown(t) {
        for (let i = t; i > 0; i--) {
            const hours = String(Math.floor(i / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((i % 3600) / 60)).padStart(2, '0');
            const seconds = String(i % 60).padStart(2, '0');
            process.stdout.write(colors.white(`[*] Cần chờ ${hours}:${minutes}:${seconds}     \r`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r');
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async checkRank() {
        const rankDataUrl = 'https://api-web.tomarket.ai/tomarket-game/v1/rank/data';
        const evaluateUrl = 'https://api-web.tomarket.ai/tomarket-game/v1/rank/evaluate';
        const createRankUrl = 'https://api-web.tomarket.ai/tomarket-game/v1/rank/create';

        try {
            const rankDataRes = await this.http(rankDataUrl, this.headers, '{}');
            if (rankDataRes.status === 200 && rankDataRes.data.status === 0) {
                if (rankDataRes.data.data.isCreated) {
                    const currentRank = rankDataRes.data.data.currentRank;
                    this.log(colors.green(`Rank hiện tại: ${currentRank.name}`));
                    return;
                }
            }

            const evaluateRes = await this.http(evaluateUrl, this.headers, '{}');
            if (evaluateRes.status === 200 && evaluateRes.data.status === 0) {
                const { stars } = evaluateRes.data.data;
                this.log(colors.yellow(`Kiểm tra tài khoản... số sao: ${stars}`));
            }

            const createRankRes = await this.http(createRankUrl, this.headers, '{}');
            if (createRankRes.status === 200 && createRankRes.data.status === 0) {
                const currentRank = createRankRes.data.data.currentRank;
                this.log(colors.green(`Kiểm tra rank thành công, rank hiện tại: ${currentRank.name}`));
            }
        } catch (error) {
            this.log(colors.red(`Lỗi khi kiểm tra rank: ${error.message}`));
        }
    }

    async getTasks() {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/tasks/list';
        const data = JSON.stringify({ language_code: 'en' });
        try {
            const res = await this.http(url, this.headers, data);
            if (res.status === 200 && res.data.status === 0) {
                return res.data.data;
            }
            return null;
        } catch (error) {
            this.log(colors.red(`Lỗi khi lấy danh sách nhiệm vụ: ${error.message}`));
            return null;
        }
    }

async startTask(taskId, initData, maxRetries = 5) {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/tasks/start';
        const data = JSON.stringify({ task_id: taskId, init_data: initData });
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const res = await this.http(url, this.headers, data);
                
                if (res.status === 200 && res.data.status === 0) {
                    if (res.data.data.status === 1) {
                        return true;
                    } else if (res.data.data.status === 3) {
                        return 'completed';
                    }
                }
                
                if (res.data.code === 400 && res.data.message === "claim throttle") {
                    this.log(colors.yellow(`Gặp lỗi cho nhiệm vụ ${taskId}. thử lại ${attempt}/${maxRetries}`));
                    
                    if (attempt < maxRetries) {
                        const waitTime = 5;
                        this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
                        await this.countdown(waitTime);
                    } else {
                        this.log(colors.red(`Đã thử ${maxRetries} lần nhưng vẫn gặp lỗi cho nhiệm vụ ${taskId}`));
                        return false;
                    }
                } else {
                    return false;
                }
            } catch (error) {
                this.log(colors.red(`Lỗi khi bắt đầu nhiệm vụ ${taskId} (lần thử ${attempt}/${maxRetries}):`));
                
                if (attempt < maxRetries) {
                    const waitTime = 5;
                    this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
                    await this.countdown(waitTime);
                } else {
                    return false;
                }
            }
        }
        
        return false;
    }

    async claimTask(taskId) {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/tasks/claim';
        const data = JSON.stringify({ task_id: taskId });
        try {
            const res = await this.http(url, this.headers, data);
            if (res.status !== 200 || res.data.status !== 0) {
                return false;
            }
            return true;
        } catch (error) {
            this.log(colors.red(`Lỗi khi nhận thưởng nhiệm vụ ${taskId}:`));
            return false;
        }
    }

    async checkTaskStatus(taskId, initData) {
        const url = 'https://api-web.tomarket.ai/tomarket-game/v1/tasks/check';
        const data = JSON.stringify({ task_id: taskId, init_data: initData });
        try {
            const res = await this.http(url, this.headers, data);
            if (res.status === 200 && res.data.status === 0) {
                return res.data.data.status;
            } else {
                this.log(colors.yellow(`Không thể kiểm tra trạng thái nhiệm vụ ${taskId}. Response:`, JSON.stringify(res.data, null, 2)));
                return null;
            }
        } catch (error) {
            this.log(colors.red(`Lỗi khi kiểm tra trạng thái nhiệm vụ ${taskId}:`));
            return null;
        }
    }

    async processTasks(tasks, type, initData, maxRetries = 5) {
        const tasksToProcess = tasks.filter(task => type === 'default' ? task.status === 0 : true);
        let allTasksCompleted = true;

        for (const task of tasksToProcess) {
            if (type !== 'default') {
                const startResult = await this.startTask(task.taskId, initData, maxRetries);
                if (startResult === true) {
                    this.log(colors.green(`Bắt đầu nhiệm vụ ${task.taskId}: ${task.title} thành công`));
                    allTasksCompleted = false;
                } else if (startResult === 'completed') {
                    this.log(colors.blue(`Nhiệm vụ ${task.taskId}: ${task.title} đã được làm`));
                } else {
                    this.log(colors.yellow(`Không thể bắt đầu nhiệm vụ ${task.taskId}: ${task.title} sau ${maxRetries} lần thử`));
                    allTasksCompleted = false;
                }
            }
            await this.countdown(3);
        }

        if (type !== 'default') {
            if (!allTasksCompleted) {
                this.log(colors.blue('Chờ 31 giây trước khi kiểm tra trạng thái nhiệm vụ...'));
                await this.countdown(31);
            } else {
                this.log(colors.green('Tất cả các nhiệm vụ đã được hoàn thành.'));
            }

            for (const task of tasksToProcess) {
                const status = await this.checkTaskStatus(task.taskId, initData);
                if (status === 2) {
                    const claimed = await this.claimTask(task.taskId);
                    if (claimed) {
                        this.log(colors.green(`Nhận thưởng nhiệm vụ ${task.taskId}: ${task.title} thành công | phần thưởng: ${task.score}`));
                    } else {
                        this.log(colors.yellow(`Không thể nhận thưởng nhiệm vụ ${task.taskId}: ${task.title}`));
                    }
                } else if (status === 3) {
                    this.log(colors.blue(`Nhiệm vụ ${task.taskId}: ${task.title} đã hoàn thành`));
                } else {
                    this.log(colors.yellow(`Nhiệm vụ ${task.taskId}: ${task.title} chưa hoàn thành (status: ${status})`));
                }
                await this.countdown(3);
            }
        } else {
            for (const task of tasksToProcess) {
                const claimed = await this.claimTask(task.taskId);
                if (claimed) {
                    this.log(colors.green(`Nhận thưởng combo thành công: ${task.title}`));
                } else {
                    this.log(colors.yellow(`Không thể nhận thưởng nhiệm vụ ${task.taskId}: ${task.title}`));
                }
                await this.countdown(3);
            }
        }
    }

    async manageTasks(initData) {
        const tasks = await this.getTasks();
        if (!tasks) return;

        const taskTypes = ['standard', 'expire', 'default'];
        for (const type of taskTypes) {
            if (tasks[type]) {
                await this.processTasks(tasks[type], type, initData);
            }
        }
    }

    askQuestion(query) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        return new Promise(resolve => rl.question(query, ans => {
            rl.close();
            resolve(ans);
        }))
    }
    
    async main() {
        const args = require('yargs').argv;
        const dataFile = args.data || path.join(__dirname, 'data.txt');
        const marinkitagawa = args.marinkitagawa || false;
        if (!marinkitagawa) {
            console.clear();
        }
        const datas = this.loadData(dataFile);
        
        this.log('Tool được chia sẻ tại kênh telegram Dân Cày Airdrop (@dancayairdrop)'.green);
        
        const nhiemvu = await this.askQuestion('Bạn có muốn làm nhiệm vụ không? (y/n): ');
        const hoinhiemvu = nhiemvu.toLowerCase() === 'y';
        
        while (true) {
            const listCountdown = [];
            const start = Math.floor(Date.now() / 1000);

            for (let i = 0; i < datas.length; i++) {
                try {
                    const result = await this.processAccount(datas[i], i, hoinhiemvu);
                    if (result !== null) {
                        listCountdown.push(result);
                    }
                } catch (error) {
                    console.error(colors.red(`Error processing account ${i + 1}: ${error.message}`));
                    continue;
                }
                await this.countdown(this.interval);
            }

            const end = Math.floor(Date.now() / 1000);
            const total = end - start;
            const min = Math.min(...listCountdown) - total;
            if (min > 0) {
                await this.countdown(min);
            }
        }
    }

    async processAccount(data, index, hoinhiemvu) {
        const parser = parse(data);
        const user = JSON.parse(parser.user);
        const id = user.id;
        const username = user.first_name;
        
        console.log(`========== Tài khoản ${index + 1} | ${username.green} ==========`);

        const token = await this.getOrRefreshToken(id, data);
        if (!token) return null;

        this.setAuthorization(token);
        await this.checkRank();
        if (hoinhiemvu) {
            await this.manageTasks(data);
        }
        return await this.getBalance();
    }

    async getOrRefreshToken(id, data) {
        let token = this.get(id);
        if (!token || this.isExpired(token)) {
            try {
                token = await this.login(data);
                if (token) this.save(id, token);
            } catch (error) {
                console.error(colors.red(`Đăng nhập thất bại: ${error.message}`));
                return null;
            }
        }
        return token;
    }
}

(async () => {
    try {
        const app = new Tomarket();
        await app.main();
    } catch (error) {
        console.error(error);
        process.exit();
    }
})();