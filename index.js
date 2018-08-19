var express = require('express');
const app = express();
const scoresRouter = require('./routes/scores.js');
const gamesRouter = require('./routes/games.js');
const gamesSessionRouter = require('./routes/game-sessions.js')
const usersRouter = require('./routes/users.js');


//app.use(express.urlencoded());
app.use(express.json());

app.use('/api/users',usersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/scores',scoresRouter);
app.use('/api/game-sessions',gamesSessionRouter);



/*
let userList = [];
const formPage = `
                    <html>
                    <head>
                        <title>Test page</title>
                    </head>
                    <body>
                    <form method="POST" action="/postMethod/" >
                        <input name="name" type="text" />
                        <input name="passwd" type="password" />
                        <button type="submit">Submit form </button>
                    </form>
                    </body>
                    </html>
`;

app.get('/',(req,res)=>{

    res.status(200);
    res.send(formPage);
});

app.post('/postMethod',(req,res)=>{
    console.log(req.body.name);
    console.log(req.body.passwd);
    const userObj = {
        name: req.body.name,
        passwd: req.body.passwd
    }

    let userFound = userList.find((curElem)=>{
        return (req.body.name === curElem.name);
    })

    console.log('userFound:' + userFound);

    if(!userFound) {
        userList.push(userObj);
        res.status(200);
        res.send(JSON.stringify(userList));
    }
    else {
        res.status(400);
        const curUserList = {
            status: "username already exists", 
            currentUsers: userList
        }
        res.send(JSON.stringify(JSON.stringify(curUserList)));
    }

    
});

*/

app.listen(3000,()=>{
    console.log('server listening on port 3000');
})

