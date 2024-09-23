const axios = require('axios');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');

class BlackWukongAPIClient {
    constructor() {
        this.headers = {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://blackwukong.lucky-mines.com",
            "Referer": "https://blackwukong.lucky-mines.com/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36"
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

    async makeRequest(method, url, data = {}, token = null) {
        const headers = token ? { ...this.headers, "User-Auth": token } : this.headers;
        const config = {
            method,
            url,
            headers,
            data,
            httpsAgent: new HttpsProxyAgent(this.currentProxy)
        };

        try {
            const response = await axios(config);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async login(userData) {
        const url = "https://api-blackwukong.lucky-mines.com/v1/user/login";
        const payload = {
            tid: userData.id,
            parent_tid: userData.parent_tid,
            username: userData.username,
            is_premium: userData.is_premium || false,
            device: "android"
        };

        try {
            const response = await this.makeRequest('post', url, payload);
            if (response.status === 200 && response.data.code === 200) {
                return { 
                    success: true, 
                    token: response.data.data.token,
                    is_register: response.data.data.is_register
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getBalance(token) {
        const url = "https://api-blackwukong.lucky-mines.com/v1/user/balance";
        try {
            const response = await this.makeRequest('post', url, {}, token);
            if (response.status === 200 && response.data.code === 200) {
                return { 
                    success: true, 
                    coins: response.data.data.coins,
                    energy: response.data.data.energy
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async collectEnergy(token, userId) {
        const url = "https://api-blackwukong.lucky-mines.com/v1/ss/button_info";
        const payload = {
            button_type: "collect",
            user_id: `${userId}`,
            devive: "android"
        };

        try {
            const response = await this.makeRequest('post', url, payload, token);
            if (response.status === 200 && response.data.code === 200) {
                this.log("Claim thành công", 'success');
                return { success: true, data: response.data };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            this.log(`Claim không thành công: ${error.message}`, 'error');
            if (error.response) {
                this.log(`Lỗi rồi: ${JSON.stringify(error.response.data)}`, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    async exchange(token) {
        const url = "https://api-blackwukong.lucky-mines.com/v1/user/exchange";
        try {
            const response = await this.makeRequest('post', url, {}, token);
            if (response.status === 200 && response.data.code === 200) {
                return { 
                    success: true, 
                    coins: response.data.data.coins,
                    energy: response.data.data.energy,
                    energy_update_at: response.data.data.energy_update_at
                };
            } else {
                return { success: false, error: response.data.msg };
            }
        } catch (error) {
            this.log(`Exchange error: ${error.message}`, 'error');
            if (error.response) {
                this.log(`Error response: ${JSON.stringify(error.response.data)}`, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    async sign(token) {
        const url = "https://api-blackwukong.lucky-mines.com/v1/user/sign";
        try {
            const response = await this.makeRequest('post', url, {}, token);
            if (response.status === 200) {
                if (response.data.code === 200) {
                    return { 
                        success: true, 
                        sign_times: response.data.data.sign_times,
                        sign_time: response.data.data.sign_time,
                        reward_record: response.data.data.reward_record
                    };
                } else if (response.data.code === 1003 && response.data.msg === "signed") {
                    return {
                        success: true,
                        alreadySigned: true
                    };
                } else {
                    return { success: false, error: response.data.msg };
                }
            } else {
                return { success: false, error: `Unexpected response status: ${response.status}` };
            }
        } catch (error) {
            this.log(`Lỗi điểm danh: ${error.message}`, 'error');
            if (error.response) {
                this.log(`lỗi rồi: ${JSON.stringify(error.response.data)}`, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    parseQueryString(queryString) {
        const params = {};
        const pairs = queryString.split('&');
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
        return params;
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    
        while (true) {
            for (let i = 0; i < data.length; i++) {
                try {
                    this.currentProxy = this.proxies[i % this.proxies.length];
                    let proxyIP = 'Unknown';
                    try {
                        proxyIP = await this.checkProxyIP(this.currentProxy);
                    } catch (proxyError) {
                        this.log(`Lỗi khi kiểm tra IP proxy: ${proxyError.message}`, 'warning');
                    }

                    const queryString = data[i];
                    const parsedQuery = this.parseQueryString(queryString);
                    
                    let userDataParsed;
                    if (parsedQuery.user) {
                        userDataParsed = JSON.parse(parsedQuery.user);
                    } else {
                        const userParam = queryString.match(/user=([^&]+)/);
                        
                        if (!userParam) {
                            throw new Error('Định dạng dữ liệu không hợp lệ');
                        }
                        
                        userDataParsed = JSON.parse(decodeURIComponent(userParam[1]));
                    }
                    
                    const userData = {
                        id: userDataParsed.id,
                        username: userDataParsed.username,
                        parent_tid: 376905749,
                        is_premium: userDataParsed.is_premium || false
                    };
    
                    console.log(`========== Tài khoản ${i + 1} | ${userDataParsed.first_name.green} | ip: ${proxyIP} ==========`);
                    
                    this.log(`Đang đăng nhập tài khoản ${userData.id}...`, 'info');
                    const loginResult = await this.login(userData);
                    if (loginResult.success) {
                        this.log('Đăng nhập thành công!', 'success');
                        const token = loginResult.token;
                        
                        const balanceResult = await this.getBalance(token);
                        if (balanceResult.success) {
                            this.log(`Coins: ${balanceResult.coins}`, 'info');
                            this.log(`Năng lượng: ${balanceResult.energy}`, 'info');

                            this.log("Đang thực hiện điểm danh...", 'info');
                            const signResult = await this.sign(token);
                            if (signResult.success) {
                                if (signResult.alreadySigned) {
                                    this.log("Hôm nay bạn đã điểm danh rồi", 'warning');
                                } else {
                                    this.log("Điểm danh thành công", 'success');
                                    this.log(`Số lần điểm danh: ${signResult.sign_times}`, 'info');
                                    this.log(`Thời gian điểm danh: ${new Date(signResult.sign_time * 1000).toLocaleString()}`, 'info');
                                    this.log(`Phần thưởng: ${signResult.reward_record}`, 'info');
                                }
                            } else {
                                this.log(`Điểm danh thất bại: ${signResult.error}`, 'error');
                            }

                            if (balanceResult.energy > 0) {
                                this.log("Claim coin...", 'info');
                                const collectResult = await this.collectEnergy(token, userData.id);
                                if (collectResult.success) {
                                    const exchangeResult = await this.exchange(token);
                                    if (exchangeResult.success) {
                                        this.log(`Coins sau claim: ${exchangeResult.coins} | Năng lượng: ${exchangeResult.energy}`, 'info');
                                        this.log(`Energy update at: ${new Date(exchangeResult.energy_update_at * 1000).toLocaleString()}`, 'info');
                                    } else {
                                        this.log(`Exchange thất bại: ${exchangeResult.error}`, 'error');
                                    }
                                } else {
                                    this.log(`Collect energy thất bại: ${collectResult.error}`, 'error');
                                }
                            }
                        } else {
                            this.log(`Không thể lấy thông tin tài khoản: ${balanceResult.error}`, 'error');
                        }
                    } else {
                        this.log(`Đăng nhập không thành công! ${loginResult.error}`, 'error');
                    }
                } catch (error) {
                    this.log(`Lỗi xử lý dữ liệu người dùng: ${error.message}`, 'error');
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            await this.countdown(10 * 60);
        }
    }
}

const client = new BlackWukongAPIClient();
client.main().catch(err => {
    client.log(err.message, 'error');
    process.exit(1);
});