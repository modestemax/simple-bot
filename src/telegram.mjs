const TG = require("telegram-bot-api")
const api = new TG({token: "545101798:AAGM1TodXYaS0MreKKimt23KZlXTmmEH_pU"})


const sendMessage = (text) =>
    api.sendMessage({chat_id: '475514014', text}).then(e => console.log(e)).catch((e) => {
        console.error(e)
    })

export default sendMessage