const mysql = require("mysql");

//获取数据库配置信息
const mysqlConfig = require('../config/config').parseConfig.mysqlConfig;
const connection = mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    //修改时区
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

/**
 * 执行sql语句
 * @param sql
 * @returns {Promise<unknown>}
 */
function execSql(sql) {
    return new Promise(function (resolve, reject) {
        console.info("execSql---------------------------------------------------------------------------------->")
        console.info("execSql: " + sql)
        console.info("execSql---------------------------------------------------------------------------------->")
        connection.query(sql, (error, result) => {
            if (error) {
                console.error("execSql:  " + sql + ",error: ", error)
                return reject(error);
            }
            return resolve(result);
        })
    });
}

module.exports = {
    execSql
}
