const fs = require('fs')
const axios = require('axios')
const colors = require('colors')
const { parse } = require('querystring')

class main {
    constructor() {
        this.max_game_time = 180 //thời gian chơi tối đa là 800 giây
        this.max_score = 900 //điểm tối đa có thể nhận là 800
        this.headers = {
            'cache-control': 'no-cache',
            'pragma': 'no-cache',
            'accept': 'application/json, text/plain, */*',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
        }
    }
    
    create_info_data(data) {
        try {
            const parse_data = parse(data)
            const json_data = JSON.parse(parse_data.user)
            const info_data = {
                'firstName': json_data.first_name || null,
                'lastName': json_data.last_name || null,
                'telegramId': json_data.id.toString() || null,
                'userName': json_data.username || null,
                'referredBy': '5109647564',
            }
            return info_data
        } catch (error) {
            return null
        }
    }
    
    show(color, message) {
        if (color === 'red') {
            message = message.red
        } else if (color === 'yellow') {
            message = message.yellow
        } else if (color === 'green') {
            message = message.green
        } else if (color === 'blue') {
            message = message.blue
        }
        console.log(message)
    }
    
    print(...texts) {
        let message = `[ ${this.client_address} ]`.green + ` ${'=>'.yellow} ${'[ * ]'.green} `
        texts.forEach((text, index) => {
            if ((index + 1) % 2 === 0) {
                message += `${text.blue} `
            } else {
                message += `${text.white} `
            }
        });
        console.log(message)
    }

    open_file(filename) {
         try {
            const file = fs.readFileSync(filename, 'utf8')
            const file_splitlines = file.split('\n')
            if (file_splitlines.length === 1 && file_splitlines[0] === '') {
                this.show('red', `File ${filename} Không Có Dữ Liệu`)
                return null
            } else {
                return file_splitlines
            }
         } catch (error) {
            this.show('red', `Không Tìm Thấy File ${filename}`)
            return null
         }
    }
    
    authorization(type, data) {
        try {
            this.headers['Authorization'] = `${type} ${data}`
            return true
        } catch (error) {
            this.show('red', 'Đã Xảy Ra Lỗi Khi Đặt Authorization')
        }
    }
    
    async address() {
        try {
            this.api_list = [
                'https://api.ipify.org/?format=json',
                'https://ipinfo.io/json'
            ]
            const random_index = Math.floor(Math.random() * this.api_list.length)
            const random_api = this.api_list[random_index]
            const response = await axios.get(random_api)
            if (response.status === 200) {
                return response.data.ip
            }
        } catch (error) {
            return 'localhost'
        }
    }
    
    async auto_game() {
        while (true) {
            try {
                 const game_time = Math.floor(Math.random() * (this.max_game_time + 1))
                 const score = Math.floor(Math.random() * (this.max_score + 1))
                 const game_data = {
                    'gameTime': game_time,
                    'score': score
                 }
                 const res = await axios.patch('https://api.bybitcoinsweeper.com/api/users/score', game_data, { headers: this.headers })
                 if (res.status === 200) {
                    this.info.score += score
                    this.print('Đã Chơi Game Thành Công :\n   - Thời Lượng :', `${game_time} Giây\n`, '  - Điểm :', score.toString(), '\n   - Số Điểm Hiện Có :', this.info.score.toString())
                    await this.wait(30)
                 } else if (res.status === 401) {
                    this.show('yellow', 'Chuyển Tài Khoản ...')
                    await this.refresh_token()
                 } else {
                    this.show('red', `Đã Xảy Ra Lỗi Với Mã ${res.status}`)
                 }
            } catch (error) {
                this.show('yellow', 'Đã Yêu Cầu Quá Nhiều Lần Vui Lòng Chờ')
                return null
            }
        }
    }
    
    async wait(t) {
        for (;t > 0; t--) {
            const h = String(Math.floor(t / 3600)).padStart(2, '0')
            const m = String(Math.floor((t % 3600) / 60)).padStart(2, '0')
            const s = String(t % 60).padStart(2, '0')
            process.stdout.write(colors.yellow(`Cần Chờ ${h}:${m}:${s}\r`))
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        process.stdout.write('                                        \r')
    }
    
    async get_token(data) {
        try {
            const info_data = this.create_info_data(data)
            if (info_data) {
                const res = await axios.post('https://api.bybitcoinsweeper.com/api/auth/login', info_data, { headers: this.headers })
                if (res.status === 201) {
                    this.info = res.data
                    const set_authorization = this.authorization('Bearer', this.info.accessToken)
                    if (set_authorization === true) {
                        return true
                    }
                }
            }
        } catch (error) {
            console.log(error)
            return null
        }
    }
    
    async farm_mode() {
        this.show('blue', '===== Tiến Hành Cài =====')
        await this.auto_game()
    }
    
    async run() {
        while (true) {
            this.client_address = await this.address()
            const data_list = this.open_file('data.txt')
            if (data_list) {
                for (let i = 0; i < data_list.length; i++) {
                    const data = data_list[i]
                    const get_token = await this.get_token(data)
                    if (get_token === true) {
                        this.show('blue', `===== Tài Khoản ${i+1} | ${this.info.userName} =====`)
                        this.print('Point :', this.info.score.toString())
                        await this.farm_mode()
                    } else {
                        this.show('red', `Lấy Token Tài Khoản ${i+1} Thất Bại`)
                    }
                }
                this.show('blue','===== Chế Độ Chờ =====')
                await this.wait(600)
            }
        }
    }
}

(async => {
    try {
        const app = new main()
        app.run()
    } catch (error) {
        console.log(colors.red(error))
        process.exit()
    }
})()