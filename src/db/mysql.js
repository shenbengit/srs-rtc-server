const mysql = require("mysql");

//获取数据库配置信息
const mysqlConfig = require('../config/config').parseConfig.mysqlConfig;

// const connection = mysql.createConnection({
//     host: mysqlConfig.host,
//     port: mysqlConfig.port,
//     user: mysqlConfig.user,
//     password: mysqlConfig.password,
//     database: mysqlConfig.database,
//     //修改时区
//     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
// });
//使用连接池
const pool = mysql.createPool({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    //修改时区
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connectionLimit: 10, // connection number at a same time
    connectTimeout: 10000,
    waitForConnections: true, // enqueue query when no connection available
    queueLimit: 0,// unlimit queue size
});


/**
 * 执行sql语句
 * @param sql
 * @returns {Promise<unknown>}
 */
function execSql(sql) {
    return new Promise(function (resolve, reject) {
            pool.getConnection(function (err, connection) {
                if (err) {
                    console.log("Failed to connect to MySQL:", err);
                    return reject(err);
                }
                console.info(`execSql:[${sql}]`)

                connection.query(sql, (error, result) => {
                    connection.release()
                    if (error) {
                        console.error("execSql:  " + sql + ",error: ", error)
                        return reject(error);
                    }
                    return resolve(result);
                })
            })
        }
    );
}

module.exports = {
    execSql
}
