const fs = require("fs");
const YAML = require('yaml');
//读取参数配置文件
const configFile = fs.readFileSync('./config/config.yml', 'utf8');
const parseConfig = YAML.parse(configFile);

// Docker 部署时通过环境变量覆盖 MySQL 配置，本地运行仍使用 config.yml。
parseConfig.mysqlConfig = {
    ...parseConfig.mysqlConfig,
    host: process.env.MYSQL_HOST || parseConfig.mysqlConfig.host,
    port: Number(process.env.MYSQL_PORT || parseConfig.mysqlConfig.port),
    user: process.env.MYSQL_USER || parseConfig.mysqlConfig.user,
    password: process.env.MYSQL_PASSWORD || parseConfig.mysqlConfig.password,
    database: process.env.MYSQL_DATABASE || parseConfig.mysqlConfig.database
};

console.log("config.yml:", parseConfig);

module.exports = {
    parseConfig
}
