let express = require('express');
let router = express.Router();

//use reddis to store each game session data
let reddis = require('redis');

//create reddis client
reddis_client = reddis.createClient();

//check if reddis client is ready
reddis_client.on("error", function(err){
    console.log("Reddis client error "+ err);
})

//routes.post('/scores/game-sessions/:gameSessionId/users/:userId') with score in POST body for practice as application/json
router.post('/scores/:id',(req,res)=>{
    
    const game_id = req.body.game_id;
    const user_id = req.body.user_id;
    const score = req.body.score;

    //store current user score to reddis object
    reddis.hmset([game_id,user_id,score],(error,res)=>{
        console.log("reddis res " + res)
    });

    //find next user in reddis game object for current game to switch internal state user variable
    reddis.lrange([game_id,'0','-1'],(error,res)=>{
        console.log("reddis res " + res);
    })
});


module.exports = router;
