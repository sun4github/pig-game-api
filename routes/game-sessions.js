var express = require('express');
var router = express.Router();

var redis = require('redis');
var redis_client = redis.createClient();

var superagent = require('superagent');

//move this later to a environment variable
const _MAX_USERS_PER_GAME_SESSION = 2

//each game has a hash of format: game_id_1 :{currentPlayer:<uid> <uid1>:<score>, <uid2>:<score>}
router.get('/',(req,res)=>{
    redis_client.keys('game_id_*',(err,data)=>{
       if(err) { return serverWentWrong() }

       
       var usersList = Array.prototype.slice.call(data);
       
       if(usersList.length == 0) {return sendCustomMessage(res,'400', 'No user sessions')}
        
       new Promise((resolve,reject)=>{
        var sessionList = [];
        var uLen = 0;
        var changedUserList = usersList.forEach((curElem)=>{
            
            redis_client.LRANGE([curElem,'0','-1'],(err,each_elem)=>{
                const custObj = {
                    'game_id': curElem,
                    'user_count': each_elem.length
                }
                console.log(custObj);
                sessionList.push(custObj);

                if(uLen < usersList.length-2)
                    uLen++;
                else 
                    resolve(sessionList);
            }); // lrange callback

        });
    })
    .then((result)=>{
        console.log('final call');
        sendCustomMessage(res, '200', JSON.stringify(result));
    })
    .catch((err)=>{
        console.error(err);
    })

});


});

/*
    get all the information about a game session, such as scores and user ID's
*/
router.get('/:id',(req,res)=>{
    redis_client.lrange(['game_id_'+ req.params.id,'0','-1'],(err,gameIdData)=>{
        if(err) {
            res.status(404);
            res.send(JSON.stringify({'message': 'No such game exists'}));
        }
        else {
            var userList = Array.prototype.slice.call(gameIdData);
            res.status(200);
            res.send(userList);
        }
    })//for given game_id
})

/*
    delete a given game session
*/
router.delete('/:id',(req,res)=>{


    redis_client.del(['game_id_'+ req.params.id],(err,delData)=>{
        if(err) {
            res.status(400);
            res.send(JSON.stringify({'message':'No such game exists'}))
        }
        else {
            res.status(204);
            res.send('No Content');
        }
    });
});



/*
    create a new game session using passed in game ID, if no session exists add it.
    Add passed in user to the game session
    update the user count of game header to 1 (in games key)
*/

router.post('/:gameid/users/:userid',(req,res)=>{
   
    //locate and update game header
    redis_client.lrange(['games','0','-1'],(err, lrange_data)=>{
        var gamesList = Array.prototype.slice.call(lrange_data);
        if(gamesList.length == 0)
            return sendCustomMessage(res,'404','No games found');
        else {
            var foundAtIndex = -1;
            var foundGame = gamesList.find((curElem, index)=>{
                var jObj = JSON.parse(curElem);
                //console.log('curElem.game_id: ' + jObj.game_id);
                //console.log('req.params.gameid: ' + req.params.gameid);
                foundAtIndex = index;
                return (jObj.game_id === parseInt(req.params.gameid));
            });

            if(!foundGame)
                return sendCustomMessage(res,'404','No game header found');
            else {
                var  game_status = 'initiated';
                //update session count
                //LIST redis_client.RPUSH(['game_id_'+req.params.gameid,JSON.stringify({'uid': req.params.userid,'score':0})]);
                const userId = req.params.userid;

                let  user_count_data = 0;
                redis_client.HLEN('game_id_'+req.params.gameid,(err,hlen_res)=>{
                    console.log('hlen_res:' + hlen_res);
                    user_count_data = parseInt(hlen_res);

                    //if more than one key exists then remove the key corresponding to "currentPlayer" from user count
                    if(user_count_data > 0) {
                        user_count_data -= 1;
                    }

                    if(user_count_data == 0) {
                        //console.log('setting current player ' + user_count_data + ' to ' + userId);
                        redis_client.HSET(['game_id_'+req.params.gameid,'currentPlayer',userId],(err,hset_res)=>{
                           
                        });
                    }
                   
                    redis_client.HSET(['game_id_'+req.params.gameid,userId,0],(err,hset_res)=>{
                        user_count_data++;
                        if(parseInt(user_count_data) >= _MAX_USERS_PER_GAME_SESSION)
                        {
                            game_status = 'started';
                            //use superagent to start the session - as by convention all API endpoints must interact through external endpoints
                            superagent.patch('http://192.168.1.136:3000/api/games/' + req.params.gameid + '?status=' + game_status)
                                .set('Content-Type','application/json')
                                .end((res)=>{console.log(res)})
                        }
    
                        console.log('game header found at index ' + foundAtIndex + " and user_count_data = " + user_count_data);
                    
                        var jObj = JSON.parse(foundGame);
                        jObj.user_count = user_count_data;
                        redis_client.LSET(['games',foundAtIndex,JSON.stringify(jObj)],(err,data)=>{            
                            res.status(200);
                            res.send(JSON.stringify({ game_id: jObj.game_id, game_status: game_status}));
                        });
                    });  

                });
                
               
                

              
                


                /*
                //get session users count
                var user_count_data = 0, game_status = 'initiated';
                redis_client.LLEN('game_id_'+req.params.gameid,(err,len_data)=>{
                    user_count_data = len_data;
                    if(parseInt(user_count_data) == _MAX_USERS_PER_GAME_SESSION)
                    {
                        game_status = 'started';
                        //use superagent to start the session - as by convention all API endpoints must interact through external endpoints
                        superagent.patch('http://192.168.1.136:3000/api/games/' + req.params.gameid + '?status=' + game_status)
                            .set('Content-Type','application/json')
                            .end((res)=>{console.log(res)})
                    }
                    console.log('len_data ' + len_data);

                    console.log('game header found at index ' + foundAtIndex + " and user_count_data = " + user_count_data);
                
                    var jObj = JSON.parse(foundGame);
                    jObj.user_count = user_count_data;
                    redis_client.LSET(['games',foundAtIndex,JSON.stringify(jObj)],(err,data)=>{            
                        res.status(200);
                        res.send(JSON.stringify({ game_id: jObj.game_id, game_status: game_status}));
                    });
                });
                */
                
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