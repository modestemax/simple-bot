const app = {
    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    script: 'npm run start',
    instances: 1,
    autorestart: true,
    watch: true,
    max_memory_restart: '1G',
    env: {
        NODE_ENV: 'development'
    },
    env_production: {
        NODE_ENV: 'production'
    }
}
module.exports = {
    apps: [
        {
            ...app,
            name: '1d_first',
            script: 'TIME_FRAME=1d_first  ' + app.script,
        },
        {
            ...app,
            name: '1d_pump',
            script: 'TIME_FRAME=1d_pump  ' + app.script,
        },
        {
            ...app,
            name: '4h_pump',
            script: 'TIME_FRAME=4h_pump  ' + app.script,
        },
        {
            ...app,
            name: '4h_first',
            script: 'TIME_FRAME=4h_first  ' + app.script,
        },
        // {
        //     name: '5m',
        //     script: 'npm run 5m',
        //     ...app,
        // },
        // {
        //     name: '3m',
        //     script: 'npm run 3m',
        //     ...app,
        // },
    ],

    deploy: {
        production: {
            user: 'root',
            host: '167.71.216.215',
            ref: 'origin/master',
            repo: 'https://github.com/modestemax/simple-bot.git',
            path: '/root/projects/simple-bot',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
        }
    }
};
