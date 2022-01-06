const mysql = require("mysql");

//获取数据库配置信息
const mysqlConfig = require('../config/config').parseConfig.mysqlConfig;
const connection = mysql.createConnection(mysqlConfig);

/**
 * 执行sql语句
 * @param sql
 * @returns {Promise<unknown>}
 */
function execSql(sql) {
    return new Promise(function (resolve, reject) {
        connection.query(sql, (err, result) => {
            if (err) {
                return reject(err);
            }
            return resolve(result);
        })
    });
}

module.exports = {
    execSql
}
