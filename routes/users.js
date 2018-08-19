var express = require('express');
var router = express.Router();

var jwt = require('jsonwebtoken');
var config = require('config');
var superagent = require('superagent');


/*
    user - join (provide user id)
    user will only post tto this URL when joining a new game. 
    if no open games (initiated status) games exist, then a new one is started and user waits
    if open games (initiated status) exist, then the user is joined to it, and game starts (game status changes to "started" and user_count is updated)

*/
router.post('/',(req,main_res)=>{
    //no need for username - we will generate random 4 letter string for internal tracking using jwt
    //const userName = req.body.userName;
    const userId =  genRandomString(4);
    let gameId = 0;
    let gameStatus = 'initiated'

    //pick a "initiated" game - initiated will have 1 user. join the 'game-session'
    //tech: assigning a variable to promise
    var getInitiatedGameList = new Promise((resolve,reject)=>{

        superagent.get('http://192.168.1.136:3000/api/games/?status=initiated')
        .end((err,sa_res)=>{
            //console.log('sa_res');
            //console.log(Object.keys(sa_res));
            console.log(sa_res.text);
            var gamesList = []
            if(sa_res.text !== 'No games found') 
                gamesList = JSON.parse(sa_res.text).gamesList;
            //console.log('sa_res type ' + Array.isArray(gamesList) + ' gamesList.length ' + gamesList.length);
           //console.log(gamesList);
            resolve(gamesList);
        })

    });
    
    getInitiatedGameList.then(result=>{
        if(result.length == 0) {
            //utilizing a method returning a promise to chain promises
           return createGame()
        }
        else {
            console.log(JSON.parse(result[0]).game_id);
            return JSON.parse(result[0]).game_id;
        }
        // throw new Error('No games exist');
       
    })
    .then(gid=>{
        gameId = gid;
        console.log('gameId: ' + gameId);
    })
    .then((mtr)=>{
        return joinGameSession()
    })
    .then((final_status)=>{
        gameStatus = final_status;
        sendGameObj();
        
        //    throw new Error('Something went wrong');
    })
    .catch(err=>{
            console.error(err);
    })

    //method returning a promise
    function createGame() {
        return new Promise((resolve,reject)=>{
            superagent.post('http://192.168.1.136:3000/api/games/')
            .end((err,res)=>{
                console.log('new id ' + (JSON.parse(res.text).game_id));
                resolve(JSON.parse(res.text).game_id);
            })
        })      
    }


    function joinGameSession() {
        return new Promise((resolve,reject)=>{
            superagent.post('http://192.168.1.136:3000/api/game-sessions/' + gameId + '/users/' + userId)
                .end((err,sess_add)=>{
                    
                   // if(sess_add.status == 200)
                   resolve(JSON.parse(sess_add.text).game_status);
                })
        })
    }
    
    function sendGameObj() {
        console.log('send called');
        const userObj = {
            'userId': userId,
            'game-id': gameId,
            'game-status': gameStatus
        }
        const jwtString = jwt.sign(userObj,config.get('pig_game_jwt_privateKey'));

        main_res.status(200);
        main_res.setHeader('x-user-identity',jwtString);
        main_res.end();
    }



});

//future: get all games of the user

//self written function for random stringGen
function genRandomString(stringLength) {
    let charCodeList = [];
    for(var i=0;i<stringLength;i++) {
        //ascii is between 65-90 (capital letters) and 97-122 (small letters). Total 26 characters (0-25)
		var newCode = Math.floor(Math.random() * 25) + ((Math.floor(Math.random() * 10)>5)?65:97);
  		charCodeList.push(newCode);
    }
	let retString = String.fromCharCode.apply(this,charCodeList);
	return retString;
}

module.exports = router;