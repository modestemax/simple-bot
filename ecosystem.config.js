const app = {
    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
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
            name: '1d',
            script: 'npm run 1d',
            ...app
        },
        {
            name: '4h',
            script: 'npm run 4h',
            ...app,
        },
        {
            name: '5m',
            script: 'npm run 5m',
            ...app,
        },
    ],

    deploy: {
        production: {
            user: 'root',
            host: '167.71.216.215',
            ref: 'origin/master',
            repo: 'git@github.com:repo.git',
            path: '/var/www/production',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
        }
    }
};
