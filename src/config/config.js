const fs = require("fs");
const YAML = require('yaml');
//读取参数配置文件
const configFile = fs.readFileSync('./config/config.yml', 'utf8');
const parseConfig = YAML.parse(configFile);
console.log("config.yml:", parseConfig);

module.exports = {
    parseConfig
}
