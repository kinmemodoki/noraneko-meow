var express = require('express');
var router = express.Router();
var exec = require('child_process').exec;
var imgRoot = process.env.DOC_ROOT_ENV || '/usr/share/nginx/html/img/';

var mkdirp = require("mkdirp")
var fs = require("fs")
var getDirName = require("path").dirname

//127.0.0.1:6379のredisへ接続
const redis = require("redis");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const cache = redis.createClient();

var mysql = require('promise-mysql');
var pool = mysql.createPool({
  host: 'hd10th-database.czoeeaw7znu0.ap-northeast-1.rds.amazonaws.com',
  user: 'hackuser',
  password: process.env.PASS_ENV || '',
  database: 'hackday10th_test',
  connectionLimit: 10
});

function writeFile (path, contents, cb) {
  mkdirp(getDirName(path), function (err) {
    if (err) return cb(err)
    fs.writeFile(path, contents, cb)
  })
}

function createStr( n ){
  var CODE_TABLE = "0123456789"
      + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      + "abcdefghijklmnopqrstuvwxyz";
  var r = "";
  for (var i = 0, k = CODE_TABLE.length; i < n; i++){
      r += CODE_TABLE.charAt(Math.floor(k * Math.random()));
  }
  return r;
}

/*  */
router.post('/api', async function(req, res, next) {
  const dataJson = req.body;
  if(typeof req.body == "string"){
    dataJson = JSON.parse(req.body);
  }

  var orgPath = dataJson.session+'/'+createStr(12)+".png";
  var imageList = await cache.getAsync(dataJson.session);
  images = JSON.parse(imageList);
  var decode = new Buffer(dataJson.image,'base64');
  writeFile(imgRoot+orgPath, decode , function (err) {
    console.log(err);
  });
  if(!imageList){
    images = {};
    console.log("redisにデータがないよ");
  }
  console.log("l : ",Object.keys(images).length)
  images[Object.keys(images).length] = orgPath;
  cache.set(dataJson.session, JSON.stringify(images));

  if(dataJson.isFirst){
    var result = "true 12"
    
    exec('python shikibetu.py '+dataJson.image,(err, stdout, stderr) => {
      if (err) { console.log(err); }
      var newFlag,catId,catName;
      newFlag = stdout.split(" ")[0];
      if(newFlag=="true"){
        res.json({
          isNewCat:true
        });
      }else{
        catId = stdout.split(" ")[1];
        catName = stdout.split(" ")[2];
        res.json({
          isNewCat:false,
          catId:catId,
          name:name
        });
        pool.query('INSERT INTO geolocation(cat_id,location_x,location_y) VALUES(?,?,?)',catId,dataJson.pos.lat,dataJson.pos.lng);
      }
    });
  }

  if(dataJson.isLast){
    for(key in images){
      await pool.query('INSERT INTO image(image) VALUES(?)',images[key]);
      //await pool.query('INSERT INTO image(image) VALUES(?)',images[key]);
    }
  }

  res.json({res:"ok"});

});
/*
{
  image:"sdfjlasjfljlsaf==",(BASE64),
  pos:{lat:23.0242, lng:142.3333},
  session:"asdjfahsdfhaskjdfhaushdfu" //撮影する猫ごとに適当なランダム文字列
  isFirst:true,
  isLast:false
}



*/

module.exports = router;
