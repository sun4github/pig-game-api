const express = require('express');
const router = express.Router();

var redis = require('redis');
var redis_client = redis.createClient();

var superagent = require('superagent');

redis_client.on("error",(err)=>{
    console.log('games.js/reddis connection error' + err);
})

//list all games
//use query param "status" to request games with specific status like "initiated"
//use query param "user_count" to request all games with a specific user count
router.get('/',(req,res)=>{
    redis_client.lrange(['games','0','-1'],(err,data)=>{
        if(err) {
            console.log(err);
            return serverWentWrong(res);
            
        }
        //console.log(req.query);
        //check if any query parameters are in place to filter by status
        if(req.query.status || (req.query.user_count != undefined)) {
            const gamesList = Array.prototype.slice.call(data);
            if(gamesList.length == 0)
                return sendCustomMessage(res,'404','No games found');
            else {
                var matchingGames = gamesList.filter((curElem)=>{
                    var jObj = JSON.parse(curElem);
                    //console.log(req.query.status + ' ' + req.query.user_count );
                    if(req.query.status && (req.query.user_count != undefined))
                        return (jObj.status === req.query.status) && (jObj.user_count === parseInt(req.query.user_count));
                    else if(req.query.status)
                        return (jObj.status === req.query.status)
                    else if(req.query.user_count != undefined) {
                        //console.log(jObj.user_count  + ' ' + req.query.user_count );
                     return (jObj.user_count === parseInt(req.query.user_count))
                    }

                });
                //console.log(matchingGames);
                res.status(200);
                const respObj = {
                    gamesList: matchingGames
                }
                res.setHeader('Content-Type','application/json');
                return res.send(JSON.stringify(respObj));
            }
        }
        

        console.log(data);
        res.status(200);
        return res.send(JSON.stringify(data));

    });
})

//get a specific game
router.get('/:id',(req,res)=>{
    redis_client.lrange(['games','0','-1'],(err, data)=>{
        var gamesList = Array.prototype.slice.call(data);
        if(gamesList.length == 0)
            return sendCustomMessage(res,'404','No games found');
        else {
            var foundGame = gamesList.find((curElem)=>{
                var jObj = JSON.parse(curElem);
                return (jObj.game_id === parseInt(req.params.id));
            });

            if(!foundGame)
                return sendCustomMessage(res,'404','Invalid ID or No games found');
            else {
                res.status(200);
                res.send(JSON.stringify(foundGame));
            }
        }
    })
});

//create a game
router.post('/',(req,res)=>{
    //get the biggest game_id value in games list and create next to it. Initialize a key with that  (new)game_id
    let gamesList = [];
    redis_client.lrange(['games','0','-1'],(err,data)=>{


        if(err){return serverWentWrong(res)}

        var biggestID = 0;

        gamesList = Array.prototype.slice.call(data); 
        //console.log('gamesList:' + gamesList);       
        //console.log('gamesList.length:' + gamesList.length); 
        if(gamesList.length == 0)
            biggestID = 1
        else       
            biggestID = parseInt(JSON.parse(gamesList[gamesList.length-1]).game_id) + 1;
        
        //date in ms since epoch
        var startTime = Date.now();   
        const gameObj = {
            game_id: biggestID,
            startTime: startTime,
            status: 'initiated', //other status are: started, ended
            user_count: 0 //current max_user count is 2. game will start after 2 users join
        };     
        
        //console.log('biggestID:' + JSON.stringify(gameObj));
      
        redis_client.RPUSH(['games',JSON.stringify(gameObj)],(err,data)=>{            
            res.status(200);
            res.send(JSON.stringify({ game_id: gameObj.game_id}));
        });
    });
    

})

//delete a game by given id
router.delete('/:id',(req,res)=>{
    var status, message;
    //locate the id in the reddis "games" key list
    //read the list from "games" key
    redis_client.lrange(['games','0','-1'],(err,data)=>{
        if(err) { return sendCustomMessage(res,'500','Error reading datastore')}
        var gamesList = Array.prototype.slice.call(data);
        if(gamesList.length == 0) {
            return sendCustomMessage(res,'500','No games exist')
        }
        else {
            var gameFound = gamesList.find((curElem)=>{
                var jObj = JSON.parse(curElem);
                return (jObj.game_id == req.params.id)
            });

            if(gameFound) {
                redis_client.lrem(['games','1',gameFound],(err,data)=>{
                    if(err) { return sendCustomMessage(res,'500','Error deleting from datastore'); }
                    console.log(' on delete success:' + data);
                    //now delete the relevant sessions since game header is deleted
                    superagent.delete('http://192.168.1.136:3000/api/game-sessions/' + req.params.id)
                        .end((res)=>{console.log('game session deleted')});
                    return sendCustomMessage(res,'204','Game deleted')
                })
            }
            else {
                return sendCustomMessage(res,'404','Game not found');
            }
        }
    });
    //delete the key using LREM key count value
    //return status
});

//get all users of a game

//update a existing game - change it to started/ended status
router.patch('/:id',(req,res)=>{
    //locate the game by ID in 'games' first
    // then set it to status provided by the query param status
    // if status is 'started' then create a new hash 'game_id_xx'
    //if game is ending , append to game object a 'ended' property with time
    redis_client.lrange(['games','0','-1'],(err,data)=>{
        var gamesList = Array.prototype.slice.call(data);
        if(gamesList.length == 0) {
            return sendCustomMessage(res,'500','No games exist')
        }
        else {
                var foundAtIndex = 0;
                
                var foundGame = gamesList.find((curElem, index)=>{
                    //console.log(curElem);
                    var jObj = JSON.parse(curElem);
                    foundAtIndex = index;
                    return (jObj.game_id === parseInt(req.params.id));

                    //var j1 = JSON.parse();
                });
                
                if(!foundGame)
                    return sendCustomMessage(res,'400','Invalid ID or No games exist');
                else {
                    var j2 = JSON.parse(foundGame);
                    j2.status = req.query.status;
                    if(req.query.status === 'ended') {
                        j2.endTime = Date.now();
                    }
                   
                    redis_client.lset(['games',foundAtIndex,JSON.stringify(j2)],(err,data)=>{

                    });
                    return sendCustomMessage(res,'200','Game Status updated');
                }
        }
    });


});

function sendCustomMessage(res, status, message) {
    res.status(status);
    res.send(message);
}

function serverWentWrong(res) {
    res.status(500);
    res.send('Something wrong with getting all games');
}

module.exports = router;