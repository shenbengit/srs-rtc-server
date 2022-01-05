const mysql = require("mysql")
const Express = require("express")
const app = new Express()

const connection = mysql.createConnection({
    host: '121.4.94.182',
    user: 'shencoder',
    password: '123456',
    database: 'srs_rtc'
});

app.get("/getAllUser", function (req, res) {
    connection.query("select * from db_user", function (error, results, fields) {
        if (error) {
            throw  error;
        }
        res.send(results);
    });
});

app.listen(9099, function () {
    console.log("监听：9099")
});