import sgMail from '@sendgrid/mail'


export default new class {
    constructor() {
        global.sendgrid = this
    }

    send({body, to = config.admin_emails, from = 'nana@neema.co.za', subject = 'Bot Notification'}) {
        const msg = {
            to, from, subject,
            text: body,
            html: body,
        }
        sgMail.setApiKey(config.SENDGRID_API_KEY)
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })
    }
}